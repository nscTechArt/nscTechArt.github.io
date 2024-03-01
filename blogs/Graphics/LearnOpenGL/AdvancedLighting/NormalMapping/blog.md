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

[...]

如果您不完全理解这背后的数学原理，请不要担心。只要您了解我们可以从三角形的顶点及其纹理坐标计算切线和双切线（因为纹理坐标与切线向量位于同一空间中），您就成功了一半。

---

现在让我们动手实现tangent和bitangent的计算，我们
