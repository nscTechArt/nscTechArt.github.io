---
title: Real Shading in Unreal Engine 4
date: 2024-10-05 12:12 +0800
categories: [Graphics, Physical Based Rendering]
media_subpath: /assets/img/Graphics/pbr/
math: true
---

### Shading Model

#### Diffuse BRDF

对于漫反射来说，我们选择Lambert模型，原因有两点：

- Lambert模型与其他漫反射模型（如Burley）的实际效果差距很小，基本可以忽略
- 复杂的漫反射模型难以应用于IBL或球谐光照

Lambert漫反射模型的公式如：


$$
f(l, v)= \frac{c_{diff}}{\pi}
$$


#### Microsoft Specular BRDF

通用的Cook-Torrance微表面镜面反射模型的公式如下：


$$
f(l, v)=\frac{D(h)F(v,h)G(l,v,h)}{4(n\cdot l)(n\cdot v)}
$$
