# 首次视频测试质检报告

## 实际执行

- 标准 watch 页面、oEmbed 元数据接口、youtu.be 短链接：均被网络代理拒绝，403 Forbidden。程序重试 watch/oEmbed 记录在 source.json。
- 未读取标题、频道、简介、发布日期；未取得字幕和时间戳。无频道身份，无法定位可靠创作者文章。
- Python 3.12.14、Pillow 12.3.0、FFmpeg、FFprobe 和 Noto 中文字体可用。
- 当前仓库与 /workspace、/tmp 未发现 native-subtitle-quote-image Skill；可用技能目录也未列出该 Skill。未调用原 Skill。
- 3 项程序测试通过：视频 ID/页面 JSON 解析、证据缺失/引用/时间戳不匹配拒绝、JPG 尺寸/防覆盖/文字溢出拒绝。
- 合成测试两张 JPG 和缩略图仅在 /tmp 内生成，已视觉检查中文无乱码、分隔线一致、上下区域符合 0.54 比例；它们不是该视频内容，没有作为正式图片交付。

## 视频卡片检查结果

图片尺寸、文字完整性、遮挡、字体、分隔线、拥挤度、来源追溯、财经表述准确性、素材授权、首图正文统一性：均为**未执行**，因为未取得内容、未生成正式卡片。

实际存在的运行输出：source.json、analysis.md、cards.json（空卡片并标明阻塞）、render-config.json（预定参数）、qa-report.md、publish.md（不可发布）。cover.jpg 和 content-01.jpg **不存在**。

## 待解决

环境配置草稿新增 youtube.com、www.youtube.com、youtu.be；不含视频流域名，因为无需下载视频。需要用户在环境设置保存相关网络配置；草稿保存不表示当前机器已开放，也不保证字幕可访问。保存后使用新的输出目录再次运行。

或者提供合法可用的字幕/文字稿与来源；有文字稿后可以使用原创文字视觉完成制作，无需下载整段视频。若仍受 YouTube 本身限制，保留限制记录，不切换绕过渠道。
