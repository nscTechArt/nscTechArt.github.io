---
title: Unity中实现Hex Tiling
date: 2022-12-12 09:40 +0800
categories: [Unity, Rendering]
media_subpath: /assets/img/Unity/rendering/
tag: [Unity]
math: false
---

### 1 Motivation

传统的方形纹理平铺通常会带来很明显的纹理重复的视觉问题，尤其是在地形渲染的情况下，如下图所示：

![](231055.png)

通过Hex Tiling的手段，则可以在很大程度上减弱该问题，如下图所示：

![](231221.png)

传统的纹理平铺基于方形网格），而 Hex Tiling 使用**六边形网格**。在六边形的边缘区域，通过计算像素到相邻六边形中心的距离，**动态混合多个纹理变体，实现平滑过渡**。

![](232521.png)

此外，使用哈希函数或随机噪声为每个六边形单元生成**唯一的种子值**，**决定其纹理变体、旋转角度或缩放比例**，进一步隐藏重复的纹理特征。

---

### 2 实现细节

#### 2.1 Hash Noise Function

这个函数的作用是，给定一个Vector2，返回一个随机的范围在$[0,1]$之间Vector3：

```glsl
float3 Hash23(float2 input)
{
    float3 xyx = float3(input.x, input.y, input.x);
    float3 yxx = float3(input.y, input.x, input.x);
    float3 xyy = float3(input.x, input.y, input.y);

    float x = dot(xyx, float3(127.1, 311.7, 74.7));
    float y = dot(yxx, float3(269.5, 183.3, 246.1));
    float z = dot(xyy, float3(113.5, 271.9, 124.6));

    float3 hash = frac(sin(float3(x, y, z)) * 43758.5453);
    
    return hash;
}
```

#### 2.2 UV Transform

通过这个函数，我们可以控制UV的旋转、缩放、平移：

```glsl
float2 UVTransform(float2 uv, float rotation, float scale, float2 offset, float2 pivot = float2(0.5, 0.5))
{
    uv -= pivot;
    // rotation
    // --------
    float rad = radians(rotation);
    float2 newUV;
    newUV.x = uv.x * cos(rad) - uv.y * sin(rad);
    newUV.y = uv.x * sin(rad) + uv.y * cos(rad);
    // scaling
    // -------
    newUV *= scale;
    // translation
    // -----------
    newUV += pivot;
    newUV += offset;
    return newUV;
}
```

#### 2.3 Random UV Transform

我们已经有了UV变换的函数，并且可以通过`Hash23`来获取“随机”的变换值，那么我们就可以构建一个用于产生UV随机变换的函数：

```glsl
float2 RandomUVTransform(float2 uv, float rotationMin, float rotationMax, float scaleMin, float scaleMax, float2 randomSeed)
{
    float3 hash = Hash23(randomSeed);
    
    float rotation = lerp(rotationMin, rotationMax, frac(hash.z * 16.0));
    float scale = lerp(scaleMin, scaleMax, hash.z);
    float2 offset = hash.xy;

    return UVTransform(uv, rotation, scale, offset);
}
```

#### 2.4 Hex Grid

```glsl
HexGridResults HexGrid(float2 uv, float gridSize, float gridFocus)
{
    HexGridResults results;
    
    // step 1: transform the UV coordinates
    // ------------------------------------
    const float magicNumber = 1.732 * 0.5;
    float uvX = uv.x - uv.y * (0.5 / magicNumber);
    float uvY = uv.y * (1.0 / magicNumber);
    uv = float2(uvX, uvY) / gridSize;

    // step 2: generate a rgb square-checkerboard pattern
    // --------------------------------------------------
    float2 flooredUV = floor(uv);
    float step = flooredUV.x - flooredUV.y;
    float3 rgbCheckerboard = float3(step, step, step);
    rgbCheckerboard += float3(0.0, 1.0, 2.0);
    rgbCheckerboard *= 1.0 / 3.0;
    rgbCheckerboard += float3(1.66667, 1.66667, 1.66667);
    rgbCheckerboard = frac(rgbCheckerboard);
    rgbCheckerboard = round(rgbCheckerboard);

    // step 3: generate a diagonal-checkerboard pattern
    // ------------------------------------------------
    float3 diagonalCheckerboard = 0;
    float2 fracUV = frac(uv);
    step = fracUV.x + fracUV.y- 1.0;
    diagonalCheckerboard.x = abs(step);
    float2 swizzledFracUV = float2(fracUV.y, fracUV.x);
    swizzledFracUV = float2(1.0, 1.0) - swizzledFracUV;
    if (step > 0.0)
        diagonalCheckerboard.yz = swizzledFracUV;
    else
        diagonalCheckerboard.yz = fracUV;

    // step 4: generate a hexagonal pattern
    // ------------------------------------
    float3 R = float3(rgbCheckerboard.b, rgbCheckerboard.r, rgbCheckerboard.g);
    float3 G = float3(rgbCheckerboard.g, rgbCheckerboard.b, rgbCheckerboard.r);
    float3 B = rgbCheckerboard;
    float hexR = dot(R, diagonalCheckerboard);
    float hexG = dot(G, diagonalCheckerboard);
    float hexB = dot(B, diagonalCheckerboard);
    float3 weights = float3(hexR, hexG, hexB);
    weights = pow(weights, gridFocus);
    weights = weights / dot(weights, float3(1.0, 1.0, 1.0));

    // generate three seeds
    // --------------------
    if (step > 0.0) step = 1;
    else step = 0;
    float3 steppedCheckerboard = rgbCheckerboard * float3(step, step, step);
    float2 seed1 = rgbCheckerboard.xy;
    float2 seed2 = rgbCheckerboard.zx;
    float2 seed3 = rgbCheckerboard.yz;
    seed1 += flooredUV + float2(steppedCheckerboard.z, steppedCheckerboard.z);
    seed2 += flooredUV + float2(steppedCheckerboard.y, steppedCheckerboard.y);
    seed3 += flooredUV + float2(steppedCheckerboard.x, steppedCheckerboard.x);

    results.seed1 = seed1;
    results.seed2 = seed2;
    results.seed3 = seed3;
    results.weights = weights;
    return results;
}
```

#### 2.5 Sample Textures

```glsl
HexGridResults results = HexGrid(input.uv, _HexGridSize, _HexGridFocus);

float2 uv1 = RandomUVTransform(input.uv, _RotationMin, _RotationMax, _ScaleMin, _ScaleMax, results.seed1);
float2 uv2 = RandomUVTransform(input.uv, _RotationMin, _RotationMax, _ScaleMin, _ScaleMax, results.seed2);
float2 uv3 = RandomUVTransform(input.uv, _RotationMin, _RotationMax, _ScaleMin, _ScaleMax, results.seed3);

float4 sample1 = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, uv1);
float4 sample2 = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, uv2);
float4 sample3 = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, uv3);

float4 color = sample1 * results.weights.x + sample2 * results.weights.y + sample3 * results.weights.z;
return color;
```

---

### 3 More

#### 3.1 Normal Maps

...

#### 3.2 Work with Triplanar Mapping

...
