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

#### glVertexAttribPointer

在OpenGL中，我们需要自行告诉OpenGL如何理解vertex data，详细的函数声明如下：

```c++
void glVertexAttribPointer( GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, const GLvoid * pointer);
```

就像函数名一样，`glVertexAttribPointer`本身并不直接提供数据，而是提供了一个指针，OpenGL将在渲染时为其提供对应的数据。



以下是各个参数的简要说明：

- `index`: 指定要配置的通用顶点属性数组的索引，对应在顶点shader中的layout(location = index)。
- `size`: 指定每一个顶点属性的组件数量。有效的值为1, 2, 3, 4。例如，如果我们的位置是一个3D矢量，那么size就是3。
- `type`: 指定数组中每个组件的数据类型。可能的值有：`GL_BYTE`, `GL_UNSIGNED_BYTE`, `GL_SHORT`, `GL_UNSIGNED_SHORT`, GL_INT,`GL_UNSIGNED_INT`, `GL_HALF_FLOAT`, `GL_FLOAT`, `GL_DOUBLE`, `GL_FIXED`。
- `normalized`: 当normalized参数为`GL_TRUE`时，所有的**整数**数据将会被映射到0（对于无符号整数）或-1（对于有符号整数），到1之间。
- `stride`: 步长，连续的顶点属性之间的间隔。
- `pointer`: 在缓冲中第一个组件的字节偏移量。这通常设置为0。

让我们进一步讨论一下`normalized`这个参数：在计算图形时，有些数据会被存储为非浮点格式，比如颜色通常会被存储为unsigned char(0 ~ 255)。然后，这些数据传送给shader时，shader往往需要对这些数据进行数学运算，显然使用范围在0/-1到1之间的float格式是对运算更友好的，所以，在某些情况下，需要将`normalized`设置为`GL_TRUE`来自动完成映射。

`pointer`这个参数也是值得留意。`pointer`指定了buffer data开始的位置或偏移量。大部分情况下，我们都会从buffer的开始位置读取数据，也就是设置`pointer`为`(void*)nullptr`。

但是，在有些情况下，我们需要在一个单一的buffer中存储不同种类的顶点数据，被称为*顶点数组内部格式(Interleaved vertex array formats)*。例如，如果在一个buffer中存储了位置、颜色，可能也有不同的数据组织形式

- 先存储所有顶点的位置、然后再存储所有顶点的颜色，这时，读取颜色数据的`glVertexAttribPointer`调用会将`pointer`设为一个非零值，以跳过前面的位置数据。
- 另一种情况是我们可能将位置和颜色数据交替存储（即位置0，颜色0，位置1，颜色1，……）。这种情况下，仍然需要为位置和颜色调用`glVertexAttribPointer`，但是两次调用的pointer参数将有所不同：读取位置数据的调用将`pointer`设为0，而读取颜色数据的调用将`pointer`设为对应位置数据大小的偏移量。



这个函数实际上是在当前的顶点数组对象的缓冲区中存储或修改数据，它需要和`glBindBuffer`和`glBufferData`配合使用才可以完成数据的传输和配置。

需要注意的时，在创建一个OpenGL程序时，OpenGL每个属性(位置、颜色、纹理坐标)默认是关闭的。当我们在执行glVertexAttribPointer时，我们实际上只是在定义一个数据格式，并告诉OpenGL如何理解这个数据，我们需要调用`glEnableVertexAttribArray(index)`来明确地启动顶点数组，然后OpenGL才能读取这个数据，其中的`index`与`glVertexAttribPointer`的`index`相同

---

#### GL_LINEAR_MIPMAP_LINEAR

这个值是用来设置OpenGL中纹理参数时使用的

```c++
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
```

对于初学者来说，这个语句中存在两个*LINEAR*，很容易混淆，其实它们代表了不同的操作：

- 第一个 LINEAR：这是指在两个mipmap层级之间进行线性插值。当纹理被缩小到位于两个mipmap层级之间的大小时，OpenGL 会在相邻的两个mipmap层级中获取纹理，然后执行的线性插值。通过在两个mipmap层级之间进行混合，它可以得到一个更精确的颜色结果，并且在纹理在不同mipmap层级之间切换时，可以得到一个更平滑的过渡
- 第二个 LINEAR：这是指在单个mipmap层级内部进行线性滤波。当需要从纹理获取颜色时，OpenGL 通常需要对纹理元素（也称为texels）进行采样。由于采样点一般不会刚好位于texel的中心，因此需要从周围的texel中进行插值来计算颜色。如果设置为LINEAR，OpenGL将会在最近的四个texel之间进行双线性插值；如果设置为NEAREST，OpenGL将只取最近的那个texel。

**总结下来：它设置了在mipmap层级之间以及在纹理单元元素之间都使用线性插值**

---

#### OpenGL中的族函数 (以glTexParameter为例)

`glTexParameter` 其实是一族函数的通称，包括 `glTexParameterf`，`glTexParameteri`，`glTexParameterfv` 和 `glTexParameteriv`。这些函数用于设置纹理参数，他们之间的唯一区别在于对象数据类型和参数的数量，函数名称末尾的"i"和"f"分别代表"integer"和"float"，"v"则代表"vector"，即一组数，也就是说：

- glTexParameterf 和 glTexParameterfv 接受一个和多个浮点数（即 float）参数。
- glTexParameteri 和 glTexParameteriv 接受一个和多个整数（即 int）参数。

让我们分别举一个例子

- `glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MAX_ANISOTROPY_EXT, 16.0f);`
  - `glTexParameterf`函数接受浮点数值，此处的浮点数16.0f，设定了最大的各向异性等级。在最大各向异性级别16的设置下，OpenGL会进行更多的采样(取样)，以提高在各种角度上观察的纹理质量
- `glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);`
  - 参数`GL_LINEAR_MIPMAP_LINEAR`是一个整数常量。在OpenGL中，很多预设值往往被设置为整数常量，同时以字符串命名，例如这里的`GL_LINEAR_MIPMAP_LINEAR`，这样既维护了代码的可读性，也优化了性能。这就是为什么我们调用的是`glTexParameteri`而不是`glTexParameterf`

---
