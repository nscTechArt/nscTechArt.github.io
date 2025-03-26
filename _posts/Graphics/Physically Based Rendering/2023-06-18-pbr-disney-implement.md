---
title: Physically Based Shading at Disney
date: 2023-06-18 14:57 +0800
categories: [Graphics, Physical Based Rendering]
media_subpath: /assets/img/Graphics/pbr/
math: true
---

### Sheen

sheen lobe是所有项中相对来说最简单的一项。这是一个独立的lobe，基于*sheen*参数，该lobe的颜色会在白色与基于*sheenTint*参数的特定颜色之间进行插值，最后再加到其他lobe上。

sheen lobe的意义在于，模拟表面掠射角的光线行为，主要用于布料类材质的逆向反射或粗糙表面，以补偿仅建模单次散射的几何项导致的能量损失。

在迪士尼的BRDF实现中，sheen tint并非直接使用了Base Color，而是通过**线性空间下的CIE亮度权重计算亮度值，并进行归一化处理**，简单来说，就是从base color中提取色相与饱和度：

```glsl
float3 CalculateTint(float3 baseColor)
{
    float luminance = Dot(float3(0.3f, 0.6f, 1.0f), baseColor);
    return (luminance > 0.0f) ? baseColor * (1.0f / luminance) : float3::One_;
}
```

sheen lobe的数学表达式如下：


$$
f(sheen, \theta_d)=sheen * ((1-sheenTint)+sheenTint*tint)*(1-cos\theta_d)^5
$$


对应的代码实现为：

```glsl
static float3 EvaluateSheen(const SurfaceParameters& surface, const float3& wo, const float3& wm, const float3& wi)
{
    if(surface.sheen <= 0.0f) {
        return float3::Zero_;
    }

    float dotHL = Dot(wm, wi);
    float3 tint = CalculateTint(surface.baseColor);
    return surface.sheen * Lerp(float3(1.0f), tint, surface.sheenTint) * Fresnel::SchlickWeight(dotHL);
}
```

