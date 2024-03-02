---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/AdvancedLighting/NormalMapping/index.html
title: NormalMapping
---

### Normal Mapping

---

在文章开始之前，我看到了这个不错的视频：[**Normal map TBN matrix (youtube.com**)](https://www.youtube.com/watch?v=HDfxts9YbUA&t=49s)



法线贴图存储的值的范围在[0, 1]内，在片段着色器中，我们需要将其映射至[-1, 1]：

```glsl
uniform sampler2D normalMap;

void main()
{
	// obtain normal from normal map in range [0, 1]
	normal = texture(normal, fs_in.TexCoords).rgb;
	// transform normal vector to range [-1, 1];
	normal = noramlize(normal * 2.0 - 1.0);
	
	[...]
}
```

使用BlinnPhong模型，我们可以看到已经有了不错的法线效果：

![](files/normal_mapping_correct.png)

需要注意的是，我们所使用法线贴图中的法向量，都是指向**Z+**的方向。当平面也面向**Z+**时，一切看起来都是正确的，但是我们如果用在地面上，平面本身的法向量是指向Y+的，这样一来，照明就会出现错误，如下图所示：

![](files/normal_mapping_ground_normals.png)

我们采用的解决办法是：将光照计算在另一个坐标空间中进行，在这个坐标空间中，法线贴图中存储的normal vector始终指向**Z+**，我们将该坐标空间称为切线空间。

---

切线空间是3D模型表面的局部空间，可以理解为模型表面上每个点都有自己的坐标系。在切线空间中，法线向量通常定义为沿Z轴。所有在法线贴图中的法线都是相对于这个局部坐标系（切线空间）定义的。

切线空间的值通常存储在模型的顶点数据中，并且需要在应用法线贴图的着色器中使用。存储切线空间所需的信息包括切线(tangent)向量和副切线(bi-tangent)向量，以及法线(normal)向量，这三个向量共同定义了局部坐标系。
在贴图上读取的法线向量（处于切线空间），将通过特定矩阵转换到世界或视图空间，使法线向量根据实际模型表面的方向进行定向。这样可以使得法线与最终映射到的表面方向一致

我们将这个特定的矩阵称为TBN矩阵，TBN三个字母分别代表Tagent、Bitangent、Normal。为了构成TBN矩阵，我们需要三个相对于法线贴图的相互垂直的向量：up、right、forward。up向量我们已经清楚了，就是表面的法向量。right与forward分别是tangent和bitangent，如下图所示：

![](files/normal_mapping_tbn_vectors.png)

计算tangent和bitange的方法并不像法向量那样直观。我们可以从上图中看到，tangent与bitangent与纹理坐标的两个轴向平行。我们将在这个基础上计算**T**和**B**：

![](files/normal_mapping_surface_edges.png)

**[...]**

只要您了解我们可以从三角形的顶点及其纹理坐标计算切线和双切线（因为纹理坐标与切线向量位于同一空间中），您就成功了一半。

---

现在让我们动手实现tangent和bitangent的计算，先来看看平面的vertex data（其中1 2 3和1 3 4分别组成了两个三角形）

```c++
// positions
glm::vec3 pos1(-1.0,  1.0, 0.0);
glm::vec3 pos2(-1.0, -1.0, 0.0);
glm::vec3 pos3( 1.0, -1.0, 0.0);
glm::vec3 pos4( 1.0,  1.0, 0.0);
// texture coordinates
glm::vec2 uv1(0.0, 1.0);
glm::vec2 uv2(0.0, 0.0);
glm::vec2 uv3(1.0, 0.0);
glm::vec2 uv4(1.0, 1.0);
// normal vector
glm::vec3 nm(0.0, 0.0, 1.0);  
```

首先我们计算第一个三角形的edge和delta UV：

```c++
glm::vec3 edge1 = pos2 - pos1;
glm::vec3 edge2 = pos3 - pos1;
glm::vec2 deltaUV1 = uv2 - uv1;
glm::vec2 deltaUV2 = uv3 - uv1;  
```

现在我们可以按照前面推导出的等式来计算tangent和bitangent了：

```c++
float f = 1.0f / (deltaUV1.x * deltaUV2.y - deltaUV2.x * deltaUV1.y);

tangent1.x = f * (deltaUV2.y * edge1.x - deltaUV1.y * edge2.x);
tangent1.y = f * (deltaUV2.y * edge1.y - deltaUV1.y * edge2.y);
tangent1.z = f * (deltaUV2.y * edge1.z - deltaUV1.y * edge2.z);

bitangent1.x = f * (-deltaUV2.x * edge1.x + deltaUV1.x * edge2.x);
bitangent1.y = f * (-deltaUV2.x * edge1.y + deltaUV1.x * edge2.y);
bitangent1.z = f * (-deltaUV2.x * edge1.z + deltaUV1.x * edge2.z);
  
[...] // similar procedure for calculating tangent/bitangent for plane's second triangle
```

这样，我们就定义好了每个顶点的tangent和bitangent向量。

---

为了使用normal mapping，我们首先需要在shader中创建一个TBN矩阵。为此，我们将计算好的tangent和bitangent向量作为顶点属性传进vertex shader：

```glsl
#version 330 core
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aNormal;
layout (location = 2) in vec2 aTexCoords;
layout (location = 3) in vec3 aTangent;
layout (location = 4) in vec3 aBitangent;
```

然后在vertex shader中main函数中，我们创建TBN矩阵：

```glsl
void main()
{
	[...]
	Vec3 T = normalize(vec3(model * vec4(aTangent, 0.0)));
    Vec3 B = normalize(vec3(model * vec4(aBitangent, 0.0)));
    Vec3 N = normalize(vec3(model * vec4(aNormal, 0.0)));
    mat3 TBN = mat3(T, B, N);
}
```

> 从数学的角度来看，我们没必要在vertex shader中定义bitangent，因为T、B、N三者是相互垂直的，我们可以通过cross product来获取B
