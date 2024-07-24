---
title: Learn OpenGL Lighting
date: 2024-07-24 016:51 +0800
categories: [Graphics, Learn OpenGL]
media_subpath: /assets/img/Graphics/LearnOpenGL/
math: true
---

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
