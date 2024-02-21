---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/Lighting/LightCasters/index.html
title: LightCasters
---

### Light Casters

---

本篇博客我们来讨论三种光源：平行光、点光源、聚光灯

---

当光源处于远离观察者的位置时，从光源发出的光线近乎平行。无论物体和/或观察者在哪里，所有的光线看起来都似乎来自同一个方向。太阳是一个很好的例子。

![](files/light_casters_directional.png)

因为所有光线都是平行的，场景的物体与光源的相对位置关系就没有意义了。对于平行光来说，我们就不需要再根据光源位置和片段位置来计算光线的方向了，直接设置一个即可。

```glsl
struct Light {
    // vec3 position; // no longer necessary when using directional lights.
    vec3 direction;
  
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};
[...]
void main()
{
  vec3 lightDir = normalize(-light.direction);
  [...]
}
```

