---
title: Lighting
date: 2024-07-24 016:51 +0800
categories: [Graphics, Learn OpenGL]
media_subpath: /assets/img/Graphics/LearnOpenGL/
math: true
---

> 本篇博客所涉及的内容较为简单，都是在[**前一篇博客**](https://lovewithyou.tech/posts/learn-opengl-gettting-started/)的基础上的拓展，没有太多涉及OpenGL的相关知识，所以本篇博客的内容较为简略

### Basic Lighting

我们来为OpenGL程序实现Phong光照模型。

Phong光照模型由三部分组成：环境光、漫反射、高光反射

#### Ambient lighting

环境光是场景中的均匀光源，模拟的是从所有方向散射而来的光线。

在我们的程序中，环境光的计算很简单，让灯光的颜色与一个恒定的环境光系数相乘，再乘以物体的颜色即可。

```glsl
void main()
{
    float ambientStrenght = 0.1;
    vec3 ambient = ambientStrength * lightColor;
    
    vec3 result = ambient * baseColor;
    FragColor = vec4(result, 1.0);
}
```

#### Diffuse lighting

漫反射光描述的是光线在粗糙表面上的散射。它依赖于光线方向与物体表面法线之间的夹角。**漫反射光的强度可以通过Lambert光照模型计算，即光源强度与表面漫反射系数以及光线方向与表面法线之间的夹角的余弦值的乘积。**其中，表面法线可以作为vertex data的一部分。而光线方向则需要获取当前片段的位置与光源的位置。

```glsl
void main()
{
    // ambient
    float ambientStrength = 0.1;
    vec3 ambient = ambientStrength * lightColor;

    // diffuse
    vec3 normal = normalize(Normal);
    vec3 lightDir = normalize(lightPos - FragPosWS);
    float NdotL = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = NdotL * lightColor;

    vec3 result = (ambient + diffuse) * baseColor;

    FragColor = vec4(result, 1.0);
}
```

在这里需要注意的是，我们在世界空间中完成光照计算，所以我们需要将local space中的法线变换到world space中，但是此处有几点需要我们留意：

- 通常使用的变换矩阵是4x4矩阵，它包括了旋转、缩放和平移信息。但是，对于法线向量的变换，平移是不需要的，因为法线只涉及方向。因此，应使用3x3的旋转矩阵或者将4x4矩阵的上左3x3子矩阵提取出来。
- 如果模型在局部坐标系中进行了非均匀缩放（不同方向的缩放比例不同），直接应用这个缩放矩阵会使法线变形。解决方法是使用法线变换矩阵——即原始变换矩阵的逆转置矩阵来变换法线向量。这是因为逆转置矩阵能正确处理非均匀缩放后的法线方向，保证了法线向量在变换后仍然垂直于相应的表面。
- **逆转置矩阵可以解决非均匀缩放问题，因为它通过逆矩阵消除缩放对法线方向的畸变，再通过转置矩阵保持法线的正交性，从而确保法线在变换后仍然垂直于其对应的表面。**
- 变换后法线向量可能会改变其长度。为了保持法线向量的单位长度，通常需要在变换后对法线向量进行归一化处理。

所以，在vertex shader中，我们需要完成对于法线的空间变换：

```glsl
Normal = mat3(transpose(inverse(model))) * aNormal;  
```

此外，对于GPU来说计算逆矩阵的性能成本较高，所以我们最好在CPU上完成法线矩阵的计算，并通过uniform变量传递给vertex shader。这里就不再展示相关代码了。

#### Specular lighting

镜面反射光描述的是光线在光滑表面上的反射。它依赖于视线方向与反射光方向之间的夹角。**镜面反射光的强度可以通过Phong反射模型计算，即光源强度与表面镜面反射系数以及观察方向与反射方向的夹角的余弦值的高次方的乘积。**其中幂数决定了镜面反射的锐度。

```glsl
void main()
{
    // ambient
    float ambientStrength = 0.1;
    vec3 ambient = ambientStrength * lightColor;

    // diffuse
    vec3 normal = normalize(Normal);
    vec3 lightDir = normalize(lightPos - FragPosWS);
    float NdotL = max(dot(normal, lightDir), 0.0);
    vec3 diffuse = NdotL * lightColor;

    // specular
    float specularStrength = 0.5;
    vec3 viewDir = normalize(cameraPos - FragPosWS);
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32);
    vec3 specular = specularStrength * spec * lightColor;

    vec3 base = baseColor * lightColor;
    vec3 phong = ambient + diffuse + specular;
    vec3 result = base * phong;

    FragColor = vec4(result, 1.0);
}
```

---

### Materials

我们将Phong模型中的参数提取出来，构建一个`Material`结构体：

```glsl
struct Material {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    float shininess;
}; 
```

有了这个结构体，我们可以将光照计算中的相关参数进行替换：

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

GLSL中的结构体与C++中的结构体并非同一种概念，在GLSL中，结构体充当着命名空间的作用，结构体中的成员变量实际上仍然是uniform变量。所以，我们在程序中向shader传递值的代码是这样的：

```c++
lightingShader.setVec3("material.ambient", 1.0f, 0.5f, 0.31f);
lightingShader.setVec3("material.diffuse", 1.0f, 0.5f, 0.31f);
lightingShader.setVec3("material.specular", 0.5f, 0.5f, 0.5f);
lightingShader.setFloat("material.shininess", 32.0f);
```

#### Light properties

按照我们当前的代码进行渲染，我们会看到物体所呈现的亮度过高，这是因为环境光、漫反射、镜面反射都没有任何系数衰减，都会以完成的程度进行反射。在Phong光照模型中，对于不同的光照组成部分，光源可以有不同的强度。而此前我们的光源强度默认为1，也就是：

```glsl
vec3 ambient  = vec3(1.0) * material.ambient;
vec3 diffuse  = vec3(1.0) * (diff * material.diffuse);
vec3 specular = vec3(1.0) * (spec * material.specular); 
```

为了解决这个问题，我们可以对不同的光照部分设置不同的光照强度，并且以类似于`Material`结构体的形式来传递这些值：

```c++
struct Light {
    vec3 position;
  
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};

uniform Light light;  
```

这样的话，对于各个部分的光照计算就需要改为：

```glsl
vec3 ambient  = light.ambient * material.ambient;
vec3 diffuse  = light.diffuse * (diff * material.diffuse);
vec3 specular = light.specular * (spec * material.specular);  
```

---

### Lighting Maps

我们可以引入lighting maps来为漫反射和镜面反射提供更多细节。这里就不展示具体的代码了。

---

### Light  casters

当前我们在OpenGL程序中所使用的光源是一个点，但是在现实世界中光源的种类是多样的，本篇博客中我们将会分别实现平行光、点光源、聚光灯

#### Directional light

平行光没有位置这个概念，所以在shader中，我们需要将`Light`结构体中的`position`修改为`direction`，同时我们无需再计算光照方向，而是在OpenGL程序中将平行光的方向传递给GPU。

#### Pointer Light

点光源的一个重要特征是光线强度会随着光线的传播距离增加而在所有方向上均匀衰减。我们的OpenGL程序中采用的衰减计算公式为：


$$
F_{atte}=\frac{1.0}{K_c+K_l*d+K_q*d^2}
$$


其中：

- $d$表示片段与光源之间的距离
- 常量$K_c$通常为$1.0$，用于确保当距离$d$较小或等于$0$时，分母不小于$1$，否则接近光源的片段呈现不合理的亮度。
- 线性参数$K_l$乘以距离值，以线性的方式降低强度
- 二次参数$K_q$与距离的平方相乘。当片段与光源的距离较小时，二次项的影响程度与一次项相比较小，而随着距离的增加，二次项将起主导作用。

这个衰减公式带来的效果是，光线在近距离时相当强烈，但随着距离的增加很快失去亮度，直到最终以更慢的速度失去亮度。下图显示了这种衰减在 100 距离内的影响：

![](attenuation.png)

在shader中，我们需要为`Light`结构体添加对应的三个参数，并在OpenGL程序中设置并传递相应的值。

在光照计算中，我们通过GLSL内置的`length()`函数求出片段与光源之间的距离，然后根据衰减公式求出点光源的衰减值，最后再对Phong模型中的三个光照部分分别乘以该衰减值。

#### Spot light

聚光灯与点光源类似，强度都会在随着光线的传播距离而衰减，我们在这里采用与点光源相同的距离衰减公式。

但聚光灯的最重要的特征是，它只向特定方向发射光线，结果是只有聚光灯方向上一定半径内的物体被照亮。具体的工作原理可以参考下图：

![](light_casters_spotlight_angles.png)

其中：

- **LightDir**：从片段指向光源位置的向量
- **SpotDir**：聚光灯直射的方向
- **$\phi$**：截止角度，明确了聚光灯的照射范围，任何在该范围以外的物体都不会受到聚光灯的影响
- **$\theta$**：LightDir与$\phi$之间的夹角，始终小于等于$\phi$

所以，要实现聚光灯，我们需要做的是求LightDir与SpotDir的点积，从而得到$\theta$，然后结合截止角度$\phi$判断当前片段是否受聚光灯影响，如果是，则再根据$\theta$计算相应的衰减值，从而避免在截断时有明显的硬边。

想要实现边缘平滑的聚光灯效果，我们可以模拟具有内锥体和外锥体的聚光灯，其中内锥体范围内没有边缘衰减，就是我们前面所定义的聚光灯。

实现外锥体，我们只需要定义另一个余弦值$\gamma$，用于外锥体的半径。如果片段在内锥体与外锥体之间，则需要计算出一个范围在0到1之间的强度值，如果片段在内锥体中，则强度为1，片段在外锥体外，则强度值为0。具体的计算规则遵循：


$$
I=\frac{\theta-\gamma}{\epsilon}
$$


其中，$\epsilon$内锥体截止角度与外锥体半径对应的余弦值的差值。

最终，聚光灯的光照计算如下：

```glsl
float theta     = dot(lightDir, normalize(-light.direction));
float epsilon   = light.cutOff - light.outerCutOff;
float intensity = clamp((theta - light.outerCutOff) / epsilon, 0.0, 1.0);    
...
// we'll leave ambient unaffected so we always have a little light.
diffuse  *= intensity;
specular *= intensity;
...
```

---

### Multiple lights

我们已经分别实现了平行光、点光源、聚光灯，但是OpenGL程序中每次都只有一个单一光源，这显然无法满足我们的需求。

为了能够在场景中同时使用多个光源，我们可以将不同类型的光源的光照计算封装到GLSL函数中，并在函数中实现Phong光照模型的计算。场景中每个光源都会计算各自对当前片段的影响，并最终影响片段的输出颜色。大概的计算过程如下面所示：

```glsl
out vec4 FragColor;
  
void main()
{
  // define an output color value
  vec3 output = vec3(0.0);
  // add the directional light's contribution to the output
  output += someFunctionToCalculateDirectionalLight();
  // do the same for all point lights
  for(int i = 0; i < nr_of_point_lights; i++)
  	output += someFunctionToCalculatePointLight();
  // and add others lights as well (like spotlights)
  output += someFunctionToCalculateSpotLight();
  
  FragColor = vec4(output, 1.0);
}  
```

对于每种类型的光源来说，我们需要定义出对应的结构体，并且确定对应的光照计算所需要的参数。以平行光为例

结构体为：

```glsl
struct DirLight {
    vec3 direction;
  
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
};  
uniform DirLight dirLight;
```

函数为：

```glsl
vec3 CalcDirLight(Dirlight light, vec3 normal, vec3 viewDir)
{
    vec3 lightDir = normalize(-light.direction);
    // diffuse shading
    float diff = max(dot(normal, lightDir), 0.0);
    // specular shading
    vec3 reflectDir = reflect(-lightDir, normal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shinese);
    // result
    vec3 ambient = light.ambient * diffuseMap;
    vec3 diffuse = light.diffuse * diff * diffuseMap;
    vec3 specular = light.specular * spec * specularMap;
    return ambient + diffuse + specular;
}
```

此外，我们的测试场景中会使用四个点光源，所以我们在GLSL中使用数组的形式来声明：

```glsl
#define POINT_LIGHT_NUMBER 4
uniform PointLight pointLights[POINT_LIGHT_NUMBER];
```

在OpenGL程序中，我们可以直接通过数组与索引的形式来进行入职，例如：

```c++
lightingShader.setFloat("pointLights[0].constant", 1.0f);
```
