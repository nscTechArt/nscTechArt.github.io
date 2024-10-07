---
title: 3D Graphics Rendering Cookbook Ch05 Working with Geometry Data
date: 2024-10-04 10:37 +0800
categories: [Graphics, 3D Graphics Rendering Cookbook]
media_subpath: /assets/img/Graphics/3dcookbook/
math: false
---

在本篇博客中，我们将了解如何以一种更优的形式组织并管理网格体的几何信息。内容结构如下：

- 组织网格体数据的存储
- 实现一个几何体转换工具
- 在GLSL中，绘制一个无限大的Grid
- 在OpenGL中渲染多个网格体
- 使用*MeshOptimizer*创建LOD
- 将曲面细分整合到OpenGL图形管线中

---

### Organizing the storage of mesh data

我们将一组同质的、连续存储的顶点属性称为**顶点流vertex stream**，这里的“顶点属性”通常包括顶点位置、纹理坐标和法线向量。每个顶点属性通常由多个浮点数分量组成，例如顶点位置包含三个分量。每个顶点流的长度都是相同的，即顶点数量是相同的。

LOD则是一组从现有索引数组中抽取出的索引组成的新数组，在本质上，它只是原有的索引数组的一个子集，可以直接利用原有的顶点缓存进行绘制。

在本系列博客中，我们将**网格体**定义为所有顶点数据流的集合以及所有索引缓冲区的集合 ，其中LOD对应一个索引缓冲区。

所有的顶点数据流和LOD索引缓冲区被打包进一个单独的数据块（blob）中。这样一来，我们可以通过一次 `fread()` 调用加载数据，甚至可以使用内存映射以实现直接的数据访问。这种简单的顶点数据表示形式还使我们能够直接将网格数据上传到GPU。最有趣的一点是能够将多个网格的数据合并到一个文件中（或者等效地，合并到两个大的缓冲区中，一个用于索引，另一个用于顶点属性）。在我们后续学习如何在 GPU 上实现层级细节切换技术时，这会非常有用。

在本小节中，我们暂时只处理几何数据，LOD的创建以及材质数据会在后面的小节与章节中讨论。

#### Get ready

我们先来声明结构体的数据结构：

1. 首先，我们需要定义两个常量，分别表示在单个网格体中LOD与顶点流的最大数量

   ```c++
   constexpr const uint32_t kMaxLODs {8};
   constexpr const uint32_t kMaxStreams {8};
   ```

2. 接下来，我们在一个结构体中实现网格体的定义。需要注意的是，我们有意地避免使用指针，因为它会带来隐式内存分配的问题，同时也会让数据的保存与加载复杂化。**在这里，我们存储了各个顶点流与LOD索引数组的偏移量，它们在功能上等同于指针，但相较于指针更灵活，更重要的是，偏移量的处理方式对于GPU来说更友好。**最后，我们明确地指出，所有的偏移量都是相对与数据块而言的，而非上一个顶点流或LOD索引数组。

3. 我们声明出`Mesh`结构体中的主要数据，包括顶点流和LOD的数量。这里需要说明一下，原始网格体也需要记作一个LOD，因为我们不会存储LOD索引数组的大小，而是计算LOD之间的偏移量。

   ```c++
   struct Mesh {
   	uint32_t lodCount {1};
       uint32_t streamCount;
   ```

4. 接下来是`meshSize`和`vertexCount`，前者用于表示所有LOD索引数组与所有顶点流的大小之和，它能够用于确认网格体的数据是否完整。后者表示网格体所有的顶点数量，这个值有可能大于任意单个LOD中所包含的顶点数量。

   ```c++
   uint32_t meshSize;
   uint32_t vertexCount = 0; // for all the LODs
   ```

5. 每个网格体可能会以不同的LOD渲染，我们将每个LOD的起始位置的偏移量存储在`lodOffset`数组中。理论上来说，`lodOffset`数组中应该包含`kMaxLODs - 1`个元素，因为第一个LOD不需要记录偏移量。但是在实际操作时，我们会在将数组拓展一个元素，用于表示最后一级LOD的大小

   ```c++
   uint32_t lodOffset[kMaxLODs] = {0};
   ```

6. 我们实现一个函数，用于根据每个LOD的偏移量，计算出给定LOD索引数组的大小。这里的实现方式能够解释为什么我们需要在`lodOffset`数组中存储最后一级LOD的大小。

   ```c++
   inline uint32_t getLODSize(uint32_t lod) const 
   {
       ASSERT(lod + 1 < kMaxLODs, "Error LOD level");
       return lodOffset[lod + 1] - lodOffset[lod];
   }
   ```

7. 与`lodOffset`数组类似，`streamOffset`数组存储了每个顶点流的起始位置的偏移量。然后，我们需要通过数据流的元素数量，指定出每个数据流的用法。此外，我们还可以存储元素的类型，如`float`，`unsigned int`，我们暂时先忽略。

   ```c++
   uint32_t streamOffset[kMaxStreams] = {0};
   uint32_t streamElementSize[kMaxStreams] = {0};
   ```

8. 最后，我们需要说明的是，我们在本系列博客中使用**紧密排布interleaved**的顶点流，这决定了我们如何在着色器中访问顶点属性。

接下来，我们创建一个新的结构体，作为网格体文件的“头文件”，它的结构如下：

1. 首先，我们声明一个十六进制的*magic*值，作为`MeshFileHeader`结构体的前四个字节，用于确保数据的完整性和此结构体的有效性

   ```c++
   struct MeshFileHeader
       {
           uint32_t magicValue;
   ```

2. 然后是用于表示文件中网格体的数量，这里需要与LOD数量做区分，各级LOD本质上都是同一个网格体

   ```c++
   uint32_t meshCount;
   ```

3. 方便起见，我们再定义一个网格体数据本身的起始位置的偏移量

   ```c++
   uint32_t dataBlockStartOffset;
   ```

4. 最后，我们用另外两个值分别存储索引数据和顶点数据的大小

   ```c++
   uint32_t indexDataSize;
   uint32_t vertexDataSize;
   ```

#### How it works...

在我们的应用程序中，想要使用一个模型文件，我们需要一个`Mesh`结构体数组，以及索引数据和顶点数据的数组

```c++
std::vector<Mesh> meshes;
std::vector<uint8_t> indexData;
std::vector<uint8_t> vertexData;
```

接下来，我们用伪代码来演示载入模型文件的过程：

1. 首先，我们读取文件头文件

   ```c++
   FILE *f = fopen("data/meshes/test.meshes", "rb");
   MeshFileHeader header;
   fread(&header, 1, sizeof(header), f);
   ```

2. 从文件中获取网格体的数量，进而重新确定`Mesh`数组的大小，然后在读取所有`Mesh`

   ```c++
   fread(meshes.data(), header.meshCount, sizeof(Mesh), f);
   ```

3. 获取索引数组和顶点数组的大小

   ```c++
   indexData.resize(header.indexDataSize);
   vertexData.resize(header.vertexDataSize);
   fread(indexData.data(), 1, header.indexDataSize, f);
   fread(vertexData.data(), 1, header.vertexDataSize, f);
   ```

---

### Implementing a geometry conversion tool

在实际的图形应用程序中，加载模型可能是一个繁琐且多阶段的过程。除了加载之外，我们可能还希望以特定方式预处理网格，例如优化几何数据或为网格计算 LOD。对于较大的网格，这个过程可能会变得很慢，因此在应用程序启动之前离线预处理网格并在应用程序中稍后加载它们是非常合理的。

在本小节中，我们将了解如何实现一个简单的离线网格处理工具。

#### How to do it...

我们先来看看如何使用Assimp导出网格数据，并以我们前面所定义的结构体的形式存储在二进制文件中。

> 没完成

---

