---
title: URP中实现 VHS Retro Effect
date: 2024-12-25 22:08 +0800
categories: [Unity, Rendering]
media_subpath: /assets/img/Unity/24-12-25
math: true
---

### 效果演示

{% include embed/video.html src='URP VHS Retro Effects.mp4' autoplay=true loop=true %}

VHS风格可以简单概括为上个世纪80年代和90年代初期录像带播放的视觉效果，通常包括颗粒感、色彩失真、扫描线等特征等较为明显的特征，下面是一些符合VHS风格的图片：

![](VHS-footage.webp)

![](vhs-02.jpeg)

本篇博客会尝试实现其中的某些特征效果

---

### Color Bleed

Color Bleed是指颜色信息由于VHS系统中的处理或信号传输问题而渗透到不该出现颜色的区域，进而导致画面中颜色的扩散与边界的模糊。在水平方向上，Color Bleed的问题更为显著。

![](Movie_001.gif)

#### 实现过程

Color Bleed的核心效果是向物体边缘渗透出的模糊边缘色，在这里我们可以使用dual blur框架以减少性能开销，关于dual blur可以查看我的另一篇[博客](https://loveforyou.tech/posts/urp-dual-kawase-blur/)。

在降采样过程中，使用在水平与竖直方向上具有不同的偏移值的采样点：

```glsl
float left = -1 - _BlurBias;
float right = 1 - _BlurBias;
float2 blurOffset = _MainTex_TexelSize.xy * float2(1, 0.5);
output.uvs[0] = input.uv + float2(blurOffset.x * left,  -blurOffset.y);
output.uvs[1] = input.uv + float2(blurOffset.x * right, -blurOffset.y);
output.uvs[2] = input.uv + float2(blurOffset.x * left,   blurOffset.y);
output.uvs[3] = input.uv + float2(blurOffset.x * right,  blurOffset.y);
```
{: file="ColorBleed.shader"}

在升采样时，无需做进一步模糊，只需要根据一定权重做常规的alpha混合即可：

```glsl
half4 BlurUpSampleFragment(Varyings input) : SV_Target
{
    half4 color = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv);
    color.a = _UpsampleFactor;
    return color;
}
```
{: file="ColorBleed.shader"}

当我们获取到模糊纹理后，就可以根据模糊强度在模糊纹理与场景色之间进行混合。但是，在VHS效果的前提下，我们需要考虑到VHS系统的工作原理。**VHS基于亮度与色度分离的信号传输方式，而color bleed现象是色度通道之间的扩散导致的结果**。所以我们应该对纹理进行空间转换，然后只混合色度信息，从而得到还原的效果。在这里我们可以使用YCbCr色彩空间，并将其理解为 VHS 系统色彩表示的一种数字化版本。

#### 实现代码

```glsl
sceneColor = RGBToYCbCr(sceneColor);

half3 blurredColor = SAMPLE_TEXTURE2D(_BlurredTexture, sampler_BlurredTexture, input.uv).rgb;
blurredColor = RGBToYCbCr(blurredColor);

sceneColor.rgb = lerp(sceneColor.rgb, blurredColor.rgb, _BleedIntensity);
sceneColor = YCbCrToRGB(sceneColor);
```
{: file="ColorBleed.shader"}

色彩转换的函数为

```glsl
half3 RGBToYCbCr(half3 rgb)
{
    return half3(0.0625 + 0.257 * rgb.r + 0.50412 * rgb.g + 0.0979 * rgb.b,
        0.5 - 0.14822 * rgb.r - 0.290 * rgb.g + 0.43921 * rgb.b,
        0.5 + 0.43921 * rgb.r - 0.3678 * rgb.g - 0.07142 * rgb.b);
}

half3 YCbCrToRGB(half3 ycbcr)
{
    ycbcr -= half3(0.0625, 0.5, 0.5);
    return half3(1.164 * ycbcr.x + 1.596 * ycbcr.z,
        1.164 * ycbcr.x - 0.392 * ycbcr.y - 0.813 * ycbcr.z,
        1.164 * ycbcr.x + 2.017 * ycbcr.y);
}
```
{: file="ColorBleed.shader"}


---

### Smear

在VHS系统中，由于模拟信号的延迟，会出现颜色向右“涂抹”的现象

![](20241230105258.png)

#### 实现思路

在Shader中，我们通过多次采样邻近像素的颜色值，每次采样时使用更大的偏移量，并按指数衰减权重叠加到当前像素上，模拟视觉上的“拖尾”效果。同时为了避免生成的拖影导致图像整体过亮，还需要将累加的颜色值除以累加的总能量。

#### 实现代码

```glsl
half4 color = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, input.uv);
float energy = 1;
const uint SMEAR_LENGTH = 4;
[unroll]
for (uint i = 1; i <= SMEAR_LENGTH; i++)
{
    float falloff = exp(-_Falloff * i);
    energy += falloff;
    float u = input.uv.x - _SmearTextureTexelSize * _Offset * i;
    color += SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, float2(u, input.uv.y)) * falloff;
}
return color / energy;
```
{: file="Smear.shader"}

---

### Edge Sharpening

VHS系统中，画面中的边缘区域容易亮边与暗边的失真。

![](20241230120521.png)

#### 实现思路

使用偏移的UV对场景色进行一次采样，这样我们可以得到采样结果相对于原场景色的差值，我们就以此差值作为画面中的亮边与暗边，叠加到原场景色上即可。

#### 实现代码

```glsl
float2 offsetUV = input.uv - float2(_EdgeDistance, 0);
half3 offsetColor = SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, offsetUV).rgb;

half3 edge = sharpColor - offsetColor;
color += edge * _EdgeIntensity;
```
{: file="EdgeSharpening.shader"}


---

### Film Grain

颗粒感能够为画面增强“纹理感”与“真实感”，是由胶片的物理化学特性决定的。VHS本身并不依赖胶片，所以film grain在这里指的是画面中的噪点。

#### 实现思路

- 采样噪声图，与场景色相乘后叠加在场景色上
- 为噪声添加与亮度相关的遮罩，噪声在亮度大的地方影响较小

亮度响应的效果如下图所示：

![](20241228102948.png)

![](20241228103011.png)

#### 实现代码

Film Grain是Unity内置的后处理效果

```glsl
half3 ApplyGrain(half3 input, float2 uv, TEXTURE2D_PARAM(GrainTexture, GrainSampler), float intensity, float response, float2 scale, float2 offset, float oneOverPaperWhite)
{
    // Grain in range [0;1] with neutral at 0.5
    half grain = SAMPLE_TEXTURE2D(GrainTexture, GrainSampler, uv * scale + offset).w;

    // Remap [-1;1]
    grain = (grain - 0.5) * 2.0;

    // Noisiness response curve based on scene luminance
    float lum = Luminance(input);
    #ifdef HDR_INPUT
    lum *= oneOverPaperWhite;
    #endif
    lum = 1.0 - sqrt(lum);
    lum = lerp(1.0, lum, response);

    return input + input * grain * intensity * lum;
}
```
{: file="FilmGrain.shader"}

---

### Tape Noise

Tape noise指的是画面中出现的噪声条纹，这些条纹通常呈现水平分布，并且会在竖直方向上运动。

![](20241228105744.png)

#### 实现思路

> 参考了Vladimir Storm的实现，详见[VHS tape noise](https://www.shadertoy.com/view/MlfSWr)

tape noise是呈水平分布的，所以我们需要根据UV的Y值来构建噪声，从而得到水平分布的噪声线。在此基础上，为水平噪声线再次引入噪点，让噪声线呈现出不均匀的效果。

#### 实现代码

```glsl
half TapeNoise(half2 uv)
{
    half t = _Time.y * _TapeNoiseSpeed;

    // generate line noises
    // --------------------
    uv.y = 1 - uv.y;
    half y = uv.y * _ScreenParams.y;
    half lineNoise = NoiseFromIQ( half3(y * 0.012 +   0 + t, 1, 1) ) *
        NoiseFromIQ( half3(y * 0.091 + 200 + t, 1, 1) ) *
        NoiseFromIQ( half3(y * 0.917 + 421 + t, 1, 1) );

    // generate noise mask
    // -------------------
    half noiseMask =  Hash12(frac(uv + t * half2(0.234, 0.637)));
    noiseMask = noiseMask * noiseMask * noiseMask + 0.3;

    // generate tape noise
    // -------------------
    half tapeNoise = lineNoise * noiseMask;

    // saturate tape noise
    // -------------------
    tapeNoise = step(1 - _TapeNoiseAmount, tapeNoise);

    return tapeNoise * _TapeNoiseAlpha;
}
```
{: file="TapeNoise.shader"}

---

### Vertical Wrapping

在VHS系统中，出于种种原因，有可能会出现图像整体向下偏移，并在屏幕另一端“包裹”显示。

![](20241228144854.png)

#### 实现思路

思路相对简单，屏幕UV的范围在$[0, 1]$之间，我们只需要将Y轴上的UV进行一定程度偏移，再确保范围限制在$[0, 1]$之间即可。在具体的实现中，有一些细节可以控制：

- UV偏移的程度
  - 当我们确定了UV偏移的最大范围$t$后，可以在$[0, t]$中根据一个随机数做插值
- UV发生偏移的频率
  - 使用`step`函数，当该函数返回1时才会进行插值，进而产生偏移效果

#### 实现代码

```glsl
half4 Frag(Varyings input) : SV_Target
{
    float2 uv = input.texcoord;
	
    float offset = lerp(0.0, _MaxOffset, frac(_Time.z) * step(1 - _Frequency, Hash(floor(_Time.z * 3)));
    uv.y = frac(uv.y + offset);
    
    half4 color = SAMPLE_TEXTURE2D(_BlitTexture, sampler_LinearClamp, uv);

    return color;
}
```
{: file="VerticalWrapping.shader"}

---

### Interlacing

VHS系统可能导致画面边缘出现梳齿状的伪影。

![](20241228152110.png)

#### 实现思路

思路比较简单，对于UV，我们每隔几行（通过`fmod`实现）对UV添加水平偏移，从而模拟VHS中隔行扫描的效果。在具体实现中，我们需要进行两次关于屏幕尺寸的映射，以确保UV效果的正确。

#### 实现代码

```glsl
half2 InterlacingOffset(half2 uv)
{
    half offset = uv.y + _Time.y;
    offset *= _ScreenParams.y;
    
    offset = floor(offset);
    offset = fmod(offset, 2.75);
    
    offset *= _InterlacingAmount;
    offset *= rcp(_ScreenParams.x);
    
    return half2(offset, 0);
}
```
{: file="Interlacing.shader"}

---

### Scanlines

在VHS中，可能出现水平分布的暗色条纹。

![](20241228153327.png)

#### 实现思路

利用UV的Y轴与三角函数，生成一个符合扫描线特征的遮罩，通过遮罩影响场景色，最后与原场景色做插值即可

#### 实现代码

```glsl
half Scanlines(half2 uv)
{
    half scroll = _Time.y * _ScanlineSpeed;
    return sin((uv.y + scroll) * _ScanlineFrequency * 2.0 * 3.1416);
}
```
{: file="Scanline.shader"}

---

### 代码

项目地址在[这里](https://github.com/nscTechArt/URP-VHS-Retro-Effects)

