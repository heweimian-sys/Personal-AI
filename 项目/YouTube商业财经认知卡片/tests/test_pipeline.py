import copy
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from pipeline import render, validate_cards, video_id, player_data

# 合成测试文字，不对应任何真实视频，不作为发布内容。
SOURCE={'segments':[{'id':'s1','start':10,'text':'Synthetic fixture for renderer checks only.'}]}
SPEC={'evidence':[{'id':'e1','kind':'editor_analysis','segment_id':'s1',
                   'quote':'Synthetic fixture','timestamp':10,
                   'source_url':'https://example.com/test-fixture','verification':'合成测试；不可发布'}],
      'cards':[{'title':'排版验证样张\n不是视频知识卡','items':[
          {'text':t,'evidence_ids':['e1']} for t in ['仅检验中文字体','仅检验分隔线','仅检验输出尺寸','不代表原视频观点','不作为发布内容','这是合成测试数据']]},
               {'title':'证据链与排版检查','items':[{'text':'每条文字对应证据记录','evidence_ids':['e1']},
                                                   {'text':'内容核验仍需研究员完成','evidence_ids':['e1']}]}]}

class PipelineTests(unittest.TestCase):
    def test_urls_and_player(self):
        self.assertEqual(video_id('https://youtu.be/Ktu6nSWtdS0'),'Ktu6nSWtdS0')
        with self.assertRaises(ValueError): video_id('https://example.com/Ktu6nSWtdS0')
        self.assertEqual(player_data('var ytInitialPlayerResponse = {"videoDetails":{}};'),{'videoDetails':{}})

    def test_missing_evidence_refused(self):
        with self.assertRaises(ValueError): validate_cards({'segments':[]},SPEC)
        bad=copy.deepcopy(SPEC); bad['evidence'][0]['quote']='invented quote'
        with self.assertRaises(ValueError): validate_cards(SOURCE,bad)
        bad=copy.deepcopy(SPEC); bad['evidence'][0]['timestamp']=99
        with self.assertRaises(ValueError): validate_cards(SOURCE,bad)
        bad=copy.deepcopy(SPEC); bad['cards'][0]['items'][0]['evidence_ids']=['missing']
        with self.assertRaises(ValueError): validate_cards(SOURCE,bad)

    def test_render_export_and_overflow(self):
        with tempfile.TemporaryDirectory() as tmp:
            render(SOURCE,SPEC,tmp)
            for name in ['cover.jpg','content-01.jpg']:
                with Image.open(Path(tmp)/name) as image:
                    self.assertEqual(image.size,(1440,1920)); self.assertEqual(image.format,'JPEG')
            self.assertTrue((Path(tmp)/'qa-report.md').exists())
            with self.assertRaises(ValueError): render(SOURCE,SPEC,tmp)
        bad=copy.deepcopy(SPEC); bad['cards'][0]['items'][0]['text']='很长的知识文案'*80
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError): render(SOURCE,bad,tmp)
            self.assertFalse((Path(tmp)/'cover.jpg').exists())

if __name__=='__main__': unittest.main()
