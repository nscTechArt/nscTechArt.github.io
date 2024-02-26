---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/AdvancedOpenGL/AdvancedData/index.html
title: AdvancedData
---

### Advanced Data

---

在此前的博客中，我们频繁地使用buffer在GPU上存储数据。在这一章中，我们将讨论一些其他管理buffer的方法。

OpenGL中，buffer仅仅是用来管理GPU上特定内存的一个对象，仅此而已。我们将buffer与特定的buffer target绑定，来赋予buffer意义。如果绑定给`GL_ARRAY_BUFFER`，那buffer就是 vertex array buffer。

目前为止，我们都是通过`glBufferData`来填充buffer，这个函数会在显存中分配一个空间，并将数据写入到分配好的内存上。如果我们把`nullptr`传给`glBufferData`的`data`参数，这个函数就只会分配内存而不进行填充。

除了填充满这个buffer，我们也可以通过`glBufferSubData`来填充buffer的特定区域，这个函数需要我们指定`buffer target`、`offset`、data的`size`以及实际的`data`。需要注意的是，填充特定区域，需要我们首先确定分配的空间是足够的，也就是说，我们还是需要首先调用`glBufferData`

```c++
// Range: [24, 24 + sizeof(data)]
glBufferSubData(GL_ARRAY_BUFFER, 24, sizeof(data), &data); 
```

另一个将数据写入buffer的方法是获取buffer内存的指针，然后直接在内存中拷贝数据。它对应的函数是`glMapBuffer`：

```c++
float data[] = 
{
	0.5f, 1.0f, -0.35f [...]
};
glBindBuffer(GL_ARRAY_BUFFER, buffer);
// get pointer
void *ptr = glMapBuffer(GL_ARRAY_BUFFER, GL_WRITE_ONLY);
// now copy data into memory
memcpy(ptr, data, sizeof(data));
// make sure to tell OpenGL we're done with the pointer
glUnmapBuffer(GL_ARRAY_BUFFER);
```

---

通过调用glVertexAttribPointer，我们可以向OpenGL说明vertex array buffer中的attribute layout。在vertex array buffer中，我们交叉设置了(**interleaving**)顶点属性，也就是说，我们将每个顶点的位置、法线、纹理坐标放在内存中彼此相邻的位置，这是一种常见的数据布局策略。

当然，我们也可以选择不同的数据布局策略，那就是批处理(**Batched Approach**)，将同一属性(例如所有顶点的位置)的所有值放在一起。我们借助`glBufferSubData`可以复制任意的数据到已经创建好和初始化了的buffer中：

```c++
float positions[] = {...};
float normals[] = {...};
float tex[] = {...};
// fill buffer
glBufferSubData(GL_ARRAY_BUFFER, 0, sizeof(positions), &positions);
glBufferSubData(GL_ARRAY_BUFFER, sizeof(positions), sizeof(normals), &normals);
glBufferSubData(GL_ARRAY_BUFFER, sizeof(positions) + sizeof(normals), sizeof(tex), &tex);
```

我们还需要更新vertex attribute pointers来适配新的数据布局

```
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)nullptr);
glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)(sizeof(positions)));
glVertexAttribPointer(2, 2, GL_FLOAT, GL_FALSE, 2 * sizeof(float), (void*)(sizeof(positions) + sizeof(normals)));
```

这两种布局方式——交叉布局和批处理布局，各有自己的优点和缺点：
交叉布局（Interleaved）:

- 优点：对于某些图形硬件而言，它可以提高内存的访问速度，因为它能让硬件更快地预读取到顶点的所有属性。这种方式也保证了顺序访问模式，这是大多数系统内存结构的优化策略。
- 缺点：产品代码的复杂性可能会增加，因为我们需要将不同的属性数组组合成一个大的交织数组。

批处理布局（Batched）

- 优点：从程序的角度看，它更容易实现，因为通常从文件读取到的就是一个属性的批数据，无须进行额外的数据处理。
- 缺点：可能会稍微降低内存访问的性能，因为所有的某一属性值可能会在一个大的连续内存块中，而现代的计算机体系结构遵循空间局部性原则，连续访问相邻内存会得到更好的性能优化。

总的来说，哪种布局方法更好往往取决于特定的应用场景和硬件。为了确定哪种方法更有效，通常需要进行性能测试和比较。

---

当buffer填充好以后，我们可能还需要将buffer中的数据拷贝给其他buffer时使用，借助的是这个函数

```c++
void glCopyBufferSubData(GLenum readtarget, GLenum writetarget, GLintptr readoffset,
                         GLintptr writeoffset, GLsizeiptr size);
```

`glCopyBufferSubData` 是 OpenGL 的一个函数，用于在两个缓冲区之间直接复制数据，无需先将数据读取到系统内存中。这对于数据量大且需要移动的情况非常有用，因为它可以避免一些不必要的内存访问，从而提高效率。

我们来分析一下参数：

- `readTarget` 和 `writeTarget` 是要读取和写入数据的缓冲目标。这些目标可以是例如 `GL_ARRAY_BUFFER` ，`GL_ELEMENT_ARRAY_BUFFER` 等等
- `readOffset` 和 `writeOffset` 是读/写操作在其各自缓冲区内开始的偏移量（以字节为单位）
- `size` 是要复制的数据的大小，也是以字节为单位

让我们来看一个例子：

```c++
GLuint buff1, buff2;
float data[10] = {...};
glGenBuffers(1, &buff1);
glGenBuffers(1, &buff2);

// Set up buff1
glBindBuffer(GL_ARRAY_BUFFER, buff1);
glBufferData(GL_ARRAY_BUFFER, sizeof(data), data, GL_STATIC_DRAW);

// Allocate sufficient memory for buff2
glBindBuffer(GL_ARRAY_BUFFER, buff2);
glBufferData(GL_ARRAY_BUFFER, sizeof(data), NULL, GL_STATIC_DRAW);

// Now copy data from buff1 to buff2
glBindBuffer(GL_COPY_READ_BUFFER, buff1);
glBindBuffer(GL_COPY_WRITE_BUFFER, buff2);
glCopyBufferSubData(GL_COPY_READ_BUFFER, GL_COPY_WRITE_BUFFER, 0, 0, sizeof(data));
```

在这个示例中，首先创建了两个缓冲区，然后将一些数据放入 `buff1`。接着，我们为 `buff2` 分配了足够的内存，并使用 `glCopyBufferSubData` 将 buff1 中的数据复制到 `buff2`。最后，要注意我们使用了 `GL_COPY_READ_BUFFER` 和 `GL_COPY_WRITE_BUFFER`，这是 `glCopyBufferSubData` 的专用目标
