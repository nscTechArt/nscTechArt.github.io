---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/Lighting/MultipleLights/index.html
title: Multiple Lights
---

### Multiple Lights

---

这篇博客将是对本章文章的总结，我们会在场景中添加一个平行光、四个点光源、一个聚光灯。

因为每种类型的灯光所使用的计算方法是不一样的，所以我们将在glsl中用函数来实现，伪代码如下

```glsl
out vec4 FragColor;
  
void main()
{

      vec3 output = vec3(0.0);

      output += someFunctionToCalculateDirectionalLight();

      for(int i = 0; i < nr_of_point_lights; i++)
        output += someFunctionToCalculatePointLight();

      output += someFunctionToCalculateSpotLight();
  
      FragColor = vec4(output, 1.0);
}  
```

