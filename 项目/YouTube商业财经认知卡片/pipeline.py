"""Public-page acquisition and evidence-gated Pillow renderer. No video download."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT, HERO, FONT_SIZE = 1440, 1920, 0.54, 58
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
BOLD = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'

def save(path, data):
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def video_id(url):
    p = urllib.parse.urlparse(url)
    if p.scheme != 'https' or p.hostname not in {'youtu.be', 'youtube.com', 'www.youtube.com'}:
        raise ValueError('需要标准 HTTPS YouTube 链接')
    ident = p.path.strip('/') if p.hostname == 'youtu.be' else urllib.parse.parse_qs(p.query).get('v', [''])[0]
    if not re.fullmatch(r'[A-Za-z0-9_-]{11}', ident):
        raise ValueError('无法识别视频 ID')
    return ident

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=25) as response:
        data = response.read(8_000_001)
        if len(data) > 8_000_000:
            raise ValueError('文字响应超出 8MB 限制')
        return data.decode('utf-8')

def player_data(html):
    match = re.search(r'(?:var\s+)?ytInitialPlayerResponse\s*=\s*', html)
    if not match:
        return None
    return json.JSONDecoder().raw_decode(html[match.end():])[0]

def acquire(url, out, transcript=None):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    if (out/'source.json').exists():
        raise ValueError('输出目录已有 source.json；请使用新的运行目录，避免覆盖素材')
    ident = video_id(url)
    canonical = f'https://www.youtube.com/watch?v={ident}'
    source = {'video_id': ident, 'url': canonical, 'checked_at': datetime.now(timezone.utc).isoformat(),
              'title': None, 'channel': None, 'description': None, 'published_at': None,
              'attempts': [], 'transcript_status': 'unavailable', 'segments': [],
              'visual_material': 'original_typography_only', 'native_skill_found': False}
    html = None
    for kind, endpoint in [('watch', canonical), ('oembed', 'https://www.youtube.com/oembed?'+urllib.parse.urlencode({'url': canonical, 'format':'json'}))]:
        try:
            body = fetch(endpoint)
            source['attempts'].append({'kind': kind, 'status':'accessible'})
            if kind == 'watch':
                html = body
                (out/'watch.html').write_text(body, encoding='utf-8')
            else:
                meta = json.loads(body)
                source['title'] = meta.get('title')
                source['channel'] = meta.get('author_name')
                source['channel_url'] = meta.get('author_url')
        except Exception as exc:
            source['attempts'].append({'kind':kind,'status':'failed','error':str(exc)})
    if html:
        try:
            player = player_data(html)
            if player:
                details = player.get('videoDetails', {})
                micro = player.get('microformat', {}).get('playerMicroformatRenderer', {})
                source.update(title=details.get('title',source['title']),channel=details.get('author',source['channel']),
                              description=details.get('shortDescription'),published_at=micro.get('publishDate'))
                tracks = player.get('captions',{}).get('playerCaptionsTracklistRenderer',{}).get('captionTracks',[])
                source['caption_tracks'] = [{'language':t.get('languageCode'), 'kind':t.get('kind','human')} for t in tracks]
                if tracks:
                    track = next((t for t in tracks if t.get('languageCode')=='en'), tracks[0])
                    p = urllib.parse.urlparse(track['baseUrl'])
                    if p.scheme!='https' or p.hostname not in {'www.youtube.com','youtube.com'}:
                        raise ValueError('字幕地址不是许可的 YouTube HTTPS 主机')
                    q = urllib.parse.parse_qs(p.query)
                    q['fmt'] = ['json3']
                    caption_url = urllib.parse.urlunparse(p._replace(query=urllib.parse.urlencode(q,doseq=True)))
                    captions = json.loads(fetch(caption_url))
                    source['segments'] = [{'id':f's{i+1}', 'start':e.get('tStartMs',0)/1000,
                                           'duration':e.get('dDurationMs',0)/1000,
                                           'text':''.join(s.get('utf8','') for s in e.get('segs',[])).strip()}
                                          for i,e in enumerate(captions.get('events',[])) if e.get('segs')]
                    source['caption_language'] = track.get('languageCode')
                    source['caption_kind'] = track.get('kind','human')
                    if source['segments']: source['transcript_status']='public_caption_obtained'
        except Exception as exc:
            source['attempts'].append({'kind':'captions','status':'failed','error':str(exc)})
    if transcript:
        path = Path(transcript)
        content = path.read_text(encoding='utf-8-sig')
        segments = json.loads(content) if path.suffix=='.json' else [{'id':'s1','start':None,'duration':None,'text':content.strip()}]
        if not isinstance(segments,list) or not segments or any(not isinstance(s,dict) or not s.get('text') or not s.get('id') for s in segments):
            raise ValueError('文字稿 JSON 应为含 id、text、start、duration 的非空数组')
        source.update(segments=segments,transcript_status='user_supplied_unverified',
                      transcript_file=path.name,transcript_sha256=hashlib.sha256(content.encode()).hexdigest())
    save(out/'source.json',source)
    if not source['segments']:
        (out/'analysis.md').write_text('# 首次测试：内容获取受阻\n\n未取得文字稿，不评分，不推断主题、受众、卡片数量或结构。\n\n五项评分均为待评估：问题明确度 /25、信息增量 /25、证据质量 /25、中文适用性 /15、图文适配度 /10。无法判断是否达到 75 分。\n\n视频标题、频道、简介和日期见 source.json；null 表示未取得。无内容无法确定创作者官网或文章，不猜测替代来源。\n\n下一步：开放 YouTube 文字页面访问后重试，或提供获准使用的字幕/文字稿及来源。\n',encoding='utf-8')
        save(out/'cards.json',{'status':'blocked_no_source','evidence':[],'cards':[]})
        (out/'publish.md').write_text('# 待制作\n\n没有视频内容依据，未生成发布标题、正文或标签；请勿发布本运行结果。\n',encoding='utf-8')
    return source

def wrap(text, font, max_width):
    lines, line = [], ''
    for char in text:
        if char=='\n':
            lines.append(line); line=''; continue
        if font.getlength(line+char)>max_width:
            if not line: raise ValueError('字符超出可用宽度')
            lines.append(line); line=char
        else: line+=char
    if line: lines.append(line)
    return lines

def validate_cards(source, spec):
    segments = {s['id']:s for s in source.get('segments',[])}
    if not segments: raise ValueError('没有来源文字稿，拒绝渲染')
    evidence = {e['id']:e for e in spec.get('evidence',[])}
    cards = spec.get('cards',[])
    if len(cards)!=2: raise ValueError('首次测试必须恰好两张：首图和正文')
    for e in evidence.values():
        if e.get('kind') not in {'author_opinion','fact','editor_analysis','supplement'}:
            raise ValueError('证据必须标记观点类型')
        if not e.get('verification') or not e.get('source_url'):
            raise ValueError('缺少核验记录或来源 URL')
        if e.get('segment_id'):
            seg = segments.get(e['segment_id'])
            if not seg or not e.get('quote') or e['quote'] not in seg['text']:
                raise ValueError('原文无法对应文字稿')
            if e.get('timestamp') != seg.get('start'):
                raise ValueError('时间戳与来源不一致，不得编造')
        elif e['kind']!='supplement':
            raise ValueError('原作者观点/事实/编辑分析需要文字稿证据')
    for card in cards:
        if not card.get('title') or not 1<=len(card.get('items',[]))<=6:
            raise ValueError('每张须有标题和 1～6 条内容；不得为凑数重复')
        for item in card['items']:
            if not item.get('text') or not item.get('evidence_ids') or any(e not in evidence for e in item['evidence_ids']):
                raise ValueError('每条文案须有有效 evidence_ids')
    return cards

def render(source, spec, out, variant='A'):
    cards = validate_cards(source,spec)
    out = Path(out)
    out.mkdir(parents=True,exist_ok=True)
    names = ['cover.jpg','content-01.jpg']
    if any((out/n).exists() for n in names): raise ValueError('已有图片，拒绝覆盖；使用新输出目录')
    font = ImageFont.truetype(FONT,FONT_SIZE)
    title_font = ImageFont.truetype(BOLD,94 if variant=='A' else 106)
    small = ImageFont.truetype(FONT,30)
    renders, boxes = [], []
    for index,card in enumerate(cards):
        image = Image.new('RGB',(WIDTH,HEIGHT),'#080808')
        draw = ImageDraw.Draw(image)
        hero_bottom = round(HEIGHT*HERO)
        draw.rectangle((0,0,WIDTH,hero_bottom),fill='#e8e4da')
        draw.text((86,96),'海外商业与财经 / 认知笔记',font=small,fill='#55534e')
        title_lines = wrap(card['title'],title_font,WIDTH-172)
        if len(title_lines)>5: raise ValueError('首部标题过长')
        y=250 if variant=='A' else 220
        for line in title_lines:
            draw.text((86,y),line,font=title_font,fill='#151515',anchor='lt'); y+=135
        if y>hero_bottom-110: raise ValueError('标题溢出视觉区域')
        draw.text((86,hero_bottom-70),'原创文字视觉 · 非原视频截图',font=small,fill='#55534e',anchor='lt')
        items=card['items']; top=hero_bottom+48; bottom=HEIGHT-95
        row_height=(bottom-top)/len(items)
        for n,item in enumerate(items):
            lines=wrap(item['text'],font,WIDTH-172)
            text_height=len(lines)*78
            if text_height>row_height-30: raise ValueError(f'卡片 {index+1} 第 {n+1} 条溢出；精简文案，不能自动缩小字体')
            yy=round(top+n*row_height+max(0,(row_height-text_height)/2))
            for line in lines:
                draw.text((86,yy),line,font=font,fill='#f1f1ee',anchor='lt'); yy+=78
            boxes.append({'card':index+1,'item':n+1,'lines':len(lines),'bottom':yy,'slot_bottom':round(top+(n+1)*row_height)})
            if n<len(items)-1:
                ly=round(top+(n+1)*row_height)
                draw.line((86,ly,WIDTH-86,ly),fill='#424242',width=2)
        draw.text((86,HEIGHT-56),f'认知笔记  /  {index+1:02d} · {len(cards):02d}',font=small,fill='#a3a3a3',anchor='lt')
        renders.append(image)
    for name,image in zip(names,renders): image.save(out/name,quality=95,subsampling=0)
    preview=Image.new('RGB',(720,480),'#dddddd')
    for i,image in enumerate(renders): preview.paste(image.resize((360,480)),(360*i,0))
    preview.save(out/'preview.jpg',quality=95)
    save(out/'render-config.json',{'width':WIDTH,'height':HEIGHT,'hero_fraction':HERO,'font_size':FONT_SIZE,
                                  'font':FONT,'variant':variant,'visual':'original_typography','native_skill_used':False,
                                  'native_pixel_equivalence':'not_claimed','layout_checks':boxes})
    (out/'qa-report.md').write_text('# 渲染质检\n\n通过：两张 JPG 均为 1440×1920；逐行测量宽度、逐条测量高度，无截断；分隔线统一 2px；模板与中文字体一致；逐条 evidence_ids 可解析，引用原文和时间戳与输入对应。\n\n需人工复核：证据记录的真实性与外部核验结论、内容逻辑、原作者观点/编辑分析区分、收益夸大、中文手机阅读体验。程序不能将填写了核验字段等同于事实核验完成。\n\n素材：仅原创文字与几何色块，无第三方视频帧。未调用 native-subtitle-quote-image，不保证像素级复现。\n',encoding='utf-8')
    return names

def main():
    parser=argparse.ArgumentParser()
    sub=parser.add_subparsers(dest='command',required=True)
    p=sub.add_parser('acquire'); p.add_argument('url'); p.add_argument('--out',required=True); p.add_argument('--transcript')
    p=sub.add_parser('render'); p.add_argument('--source',required=True); p.add_argument('--cards',required=True); p.add_argument('--out',required=True); p.add_argument('--variant',choices=['A','B'],default='A')
    args=parser.parse_args()
    try:
        if args.command=='acquire':
            result=acquire(args.url,args.out,args.transcript)
            print(result['transcript_status'])
            return 0 if result['segments'] else 2
        render(json.loads(Path(args.source).read_text()),json.loads(Path(args.cards).read_text()),args.out,args.variant)
        print('rendered: cover.jpg, content-01.jpg, preview.jpg')
        return 0
    except Exception as exc:
        print(str(exc),file=sys.stderr); return 1

if __name__=='__main__': sys.exit(main())
