---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/Lighting/Materials/index.html
title: Materials
---

### Materials

---

本篇博客我们将创建一个材质系统，首先在fragment shader中定义一个材质结构体，定义Phong模型下的每个部分的颜色，以及这个材质的光泽度。

```glsl
#version 330 core

struct Material 
{
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    float shininess;
}; 
  
uniform Material material;
```

然后，我们要将材质加入光照计算

```glsl
void main()
{    
    // ambient
    vec3 ambient = lightColor * material.ambient;
  	
    // diffuse 
    vec3 norm = normalize(Normal);
    vec3 lightDir = normalize(lightPos - FragPos);
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = lightColor * (diff * material.diffuse);
    
    // specular
    vec3 viewDir = normalize(viewPos - FragPos);
    vec3 reflectDir = reflect(-lightDir, norm);  
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
    vec3 specular = lightColor * (spec * material.specular);  
        
    vec3 result = ambient + diffuse + specular;
    FragColor = vec4(result, 1.0);
}
```

在C++中，我们需要设置相应的`uniform`变量来设置物体的材质。然而，在设置统一变量时，GLSL中的结构体并没有任何特殊之处；结构体只是`uniform`变量的命名空间。如果我们想要填充结构体，我们需要设置每个单独的`uniform`变量，但是要以结构体的名称作为前缀

```glsl
lightingShader.setVec3("material.ambient", 1.0f, 0.5f, 0.31f);
lightingShader.setVec3("material.diffuse", 1.0f, 0.5f, 0.31f);
lightingShader.setVec3("material.specular", 0.5f, 0.5f, 0.5f);
lightingShader.setFloat("material.shininess", 32.0f);
```

---

不过目前看来，物体似乎有些过于发亮了。原因是自任何光源的环境光、漫反射和镜面反射颜色都以全力反射。光源的环境光、漫反射和镜面反射分量各有不同的强度。在之前的章节中，我们通过用强度值调整环境光和镜面反射强度来解决这个问题。我们想要做类似的事情，但这次是通过为每个光照分量指定强度向量。

```glsl
struct Light {
    vec3 position;
  
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};

uniform Light light;  
```

一个光源可能对ambient、diffuse、specular有不同强度的影响。环境光通常设置为低强度，因为我们不希望环境色过于主导。光源的漫反射分量通常设置为我们希望光源具有的确切颜色，通常是亮白色。镜面反射分量通常保持在vec3(1.0)，以全强度照射。注意，我们还在结构体中添加了光源的位置向量。

修改shader，让光源结构体参与光照计算

```glsl
vec3 ambient  = light.ambient * material.ambient;
vec3 diffuse  = light.diffuse * (diff * material.diffuse);
vec3 specular = light.specular * (spec * material.specular);  
```

同样需要在C++中传递给Shader

```glsl
lightingShader.setVec3("light.ambient",  0.2f, 0.2f, 0.2f);
lightingShader.setVec3("light.diffuse",  0.5f, 0.5f, 0.5f); // darken diffuse light a bit
lightingShader.setVec3("light.specular", 1.0f, 1.0f, 1.0f); 
```

