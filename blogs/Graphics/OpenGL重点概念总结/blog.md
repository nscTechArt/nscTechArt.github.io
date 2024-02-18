---
layout: page
permalink: /blogs/Graphics/OpenGL重点概念总结/index.html
titile: OpenGL重点概念总结
---

### OpenGL重点概念总结

---

#### VBO

VBO是vertex buffer object的缩写。VBO允许顶点数组存储在显存中，而不是每帧在CPU和GPU之间传输，从而显著提高性能。具体有如下优势：

- **减少数据传输**：通常，顶点数据在每一帧都被发送到 GPU。使用 VBO，我们可以一次性丢给 GPU 大量数据，然后在需要的时候直接调用。减少了 CPU 向 GPU 的数据传输，从而提高效率
- **更优化的存储**：GPU 可以决定将 VBO 数据存储在最适合它进行渲染的位置
- **更好的性能**：发送到 GPU 的数据分次数更少，使得渲染效率更高，有助于提高整体的性能
- **更灵活的数据管理**：VBO 提供了更灵活的方式来管理和渲染顶点数据。

使用VBO的步骤大致如下：

1. 生成：使用`glGenBuffers`创建一个新的VBO
2. 绑定：使用`glBindBuffer`，将创建的VBO设置为当前的缓冲区
3. 数据复制：使用`glBufferData`，将所用的顶点数据发送到当前绑定的缓冲区
4. 绘制：使用`glDrawArrays`或者`glDrawElements`，从当前绑定的缓冲区绘制顶点
5. 解绑和删除：绘制完成后，使用`glBindBuffer`解绑，使用`glDeletaBuffers`删除不需要的VBO

VBO所对应的buffer type是`GL_ARRAY_BUFFER`

---

#### VAO

在渲染过程中，我们可能需要频繁改变不同的vertex data和attributes，频繁修改VBO并重新向OpenGL解释是很麻烦的。这就是为什么我们要引入Vertex Array Object（VAO）这个改变，我们只需要将VBO相关的配置信息预先保存在VAO中，然后在渲染时直接绑定相关的VAO即可，极大地降低了复杂度。

一个VAO存储了以下信息：

- `glEnableVertexAttribArray`和`glDisableVertexAttribArray`的调用
- 通过`glVertexAttribPointer`配置的vertex attributes
- 通过调用`glVertexAttribPointer`与vertex attributes相关联的VBOs

使用VAO的步骤大致如下：

1. 生成：使用`glGenVertexArrays`创建一个新的VAO
2. 绑定：使用`glBindVertexArray`，将新创建的 VAO 设置为当前使用的对象
3. 配置顶点属性以及绑定和设置 VBO：如使用 glVertexAttribPointer 相关函数来进行顶点属性配置等操作。
4. 解绑：完成配置后，使用 glBindVertexArray 将 VAO 解绑。

简单来说，VAO 是一个对象，该对象保存了所有与顶点数组相关的状态，这包括缓冲对象的数据、顶点数组的组织形式等。这样使用一个 VAO，就可以快速恢复这些状态，提高了渲染效率，使代码更清晰。

---

#### EBO

在 OpenGL 中，EBO 是 Element Buffer Object 的简称。EBO 是一个类型的缓冲对象，用于存储索引，即你的顶点的索引。
在我们进行复杂图形绘制时，许多顶点会被重复使用。扫描线绘制三角形时会有重复的顶点，绘制立方体时，每个顶点都会出现在3个不同的面上。如果对每一个面所有的顶点都存储一份，就会造成很大的空间浪费。
这时候，我们就可以使用 EBO。我们使用一个数组来存储不同的顶点，然后使用另一个数组来存储形成面的顶点索引。这样，一个顶点无论出现在多少个面上，都只需存储一次。这是一种常用的空间优化方式。
在 OpenGL 中使用 EBO 的一般步骤如下：

- 生成 EBO：`glGenBuffers`() 函数来创建新的缓冲对象。
- 绑定 EBO：`glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO)`函数来绑定 EBO。
- 将索引数据复制到缓冡：glBufferData() 函数来将索引数据复制到缓冲中。
- 使用索引进行绘制：glDrawElements() 或 glDrawElementsInstanced() 函数使用索引从缓冲中绘制元素。
- 解绑 EBO：glBindBuffer() 函数来解绑 EBO。

总的来说，使用 EBO 的一个主要好处是，可以节省存储空间，并可以节省 GPU 对顶点数据的处理时间，从而提高渲染性能。

---

#### glBufferData()

glBufferData是一个专门用来把开发者定义的数据传进当前绑定的buffer的函数。第一个参数 是我们要将参数拷贝进的buffer type，因为我们此时绑定的是VBO，所以这个参数是`GL_ARRAY_BUFFER`。第二个参数是传进buffer 的data size。第三个参数是实际要传进buffer的数据。第四个参数是配置显卡如何管理我们传进的数据，有三种形式：

- **GL_STREAM_DRAW**：数据只设置一次，GPU 最多使用几次
- **GL_STATIC_DRAW**：数据只设置一次，可多次使用
- GL_DYNAMIC_DRAW：数据会经常改动，且使用频繁。

---

