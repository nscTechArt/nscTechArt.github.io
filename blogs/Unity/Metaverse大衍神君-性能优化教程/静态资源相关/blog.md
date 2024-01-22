---
layout: page
permalink: /blogs/Unity/Metaverse大衍神君-性能优化教程/静态资源相关/index.html
title: 静态资源相关
---

### 音频相关

- 在移动平台，统一使用Force To Mono模式，并讲音乐采样频率设置为22050Hz
- 音频文件的压缩
  - 通常应该尽可能使用未压缩的wav格式作为音频源文件
  - 移动端下尽可能采用Vorbis压缩方法
  - 如果是非循环的音效或者IOS平台，可以采用mp3的格式
  - 对于简短、常用的音效，可以使用解码速度快的ADPCM格式
- 音频文件的载入方式
  - Unity提供了三种载入方式：
    - Decompress On Load：通常对应压缩后文件大小小于200kb的音效文件
    - Compressed In Memory：对应复杂音效、大小大于200kb
    - Streaming：对应较长时长或背景音乐的效果，会有CPU额外开销，但是可以节省内存
- 静音时，应该销毁AudioSource，将音频从内存中卸载
