---
title: Lake House场景拆解
date: 2024-12-20 17:05 +0800
categories: [Portfolio, Unity]
media_subpath: /assets/img/Portfolio/Unity/
math: false
---

### 后处理

#### Blink

实现的思路较为简单，根据传递到Shader中的`_Blink`，生成一个椭圆形的遮罩即可

```glsl
// generate scaled UV of mask
// --------------------------
half yScale = 1 / (1 - _Blink) - 0.5;
half2 maskUV = input.texcoord - 0.5;
maskUV.y *= yScale;
// generate UV
// -----------
half mask = saturate(1 - dot(maskUV, maskUV));
mask = saturate(mask - _Blink * 0.5);
```

#### Dual Kawase Blur

