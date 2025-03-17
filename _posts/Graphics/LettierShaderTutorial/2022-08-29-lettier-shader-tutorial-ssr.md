---
title: Lettier Tutorial on SSR
date: 2022-08-29 23:38 +0800
categories: [Graphics, Scratchpixel]
media_subpath: /assets/img/Graphics/LettierShaderTutorial/
math: true
---

使用SSR，我们就能够模拟场景中其他物体的反射，而非局限在反射光源上。也就是说，在SSR算法中，光线并非直接来自于光源，而是来自于场景中的其他物体。

---

### 1 Ray Marching

SSR使用了光线步进的技巧以判断每个片段的反射。所谓的**光线步进，是一种递归地增加或缩短特定向量的长度，以实现采样空间中的信息的算法**。在SSR中，光线步进所步进的向量是经由法线反射的位置向量 。

直观地来说，光线到达场景中的某个点后，根据其法线反射到达当前像素，当光线从当前像素再次反射，进入相机时，当前像素所呈现的就是该点的颜色。而SSR算法在本质上是逆向地模拟这个过程，也就是根据视线方向与当前片段的法线，构建出反射向量，沿着该向量进行光线步进，在深度缓冲中寻找交点。

理想情况下，存在某种能够精准判断第一次交点位置的解析方法。

---

### 2 Vertex Positions

和SSAO一样，我们需要根据深度缓存在View space中重构位置信息。

---

### 3 Vertex Normals

同样的，为了能够计算反射，我们需要View space中的法线信息。当然，为了获取更精准的反射效果，我们这里可以使用经过法线贴图映射后的法线。

---

#### 4 Position Transformations

与SSAO一样，SSR算法需要在屏幕空间与View space中频繁地进行变换。所以，我们需要使用相机的投影矩阵，将View space中的坐标变换到clip space中，进而再变换到屏幕空间中，以便于我们获取片段的位置信息。

---

### 5 Reflected UV Coordinates

如前面所说的，我们需要相机的投影矩阵，以及View space中的位置与法线信息：

```glsl
uniform mat4 lensProjection;
uniform sampler2D positionTexture;
uniform sampler2D normalTexture;
```

与其他效果一样，SSR使用到了一些参数：

```glsl
float maxDistance = 15;
float resolution  = 0.3;
int   steps       = 10;
float thickness   = 0.5;
```

这些参数的含义如下：

- maxDistance：决定反射向量的最大长度
- resolution：在SSR算法中，我们需要首先执行一个pass，用于在反射方向上寻找射线与场景的交点，这是一个粗略的计算。而resolution就用于控制在第一个pass执行时要跳过多少片段
- steps：SSR第二个pass用于寻找交点的精确位置，而steps就用于控制第二个pass中算法遍历的次数。
- thickness：