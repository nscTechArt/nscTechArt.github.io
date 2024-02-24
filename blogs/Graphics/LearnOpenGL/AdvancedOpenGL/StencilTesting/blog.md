---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/AdvancedOpenGL/StencilTesting/index.html
title: StencilTesting
---

### Stencil Testing

---

当片段着色器处理完一个片段后，下一步就是stencil test。经过模板测试的片段再进行深度测试。

就像深度测试基于深度缓冲区一样，模板测试基于模板缓冲区。模板缓冲区的每个模板值包含8位，也就是说，每个像素有256个不同的模板值，我们可以自行定义这些值，并且当某个片段具备特定的模板值时，我们可以保留或丢弃片段。一个简单的例子如下：

![](files/stencil_buffer.png)

首先用零清除模具缓冲区，然后在模具缓冲区中存储一个 1s 的开放矩形。然后，只有当场景的片段的模具值包含 1 时，才会渲染场景的片段（其他片段将被丢弃）。

使用模板缓冲的大致步骤如下：

- 允许写入模板缓冲
- 渲染物体，更新模板缓冲的值
- 禁止写入模板缓冲
- 渲染物体，但是这次根据模板缓冲的值丢弃某些片段

我们使用`glEnable(GL_STENCIL_TEST`)来启用模板缓冲，并且也需要清楚缓存

```c++
glEnable(GL_STENCIL_TEST);    
```

```c++
glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT | GL_STENCIL_BUFFER_BIT); 
```

同样，就像深度测试的`glDepthMask`函数一样，模板缓冲区也有一个等效的函数。`glStencilMask`函数让我们可以设置一个位掩码，它会与即将写入缓冲区的模板值进行AND运算。默认情况下，该值设置为全部为1的位掩码，不会影响输出，但是如果我们将其设置为`0x00`，那么所有写入到缓冲区的模板值最终都会变为0。这与深度测试的`glDepthMask(GL_FALSE)`是等效的：

```c++
glStencilMask(0xFF); // each bit is written to the stencil buffer as is
glStencilMask(0x00); // each bit ends up as 0 in the stencil buffer (disabling writes)
```

---

与深度缓冲区类似，我们也可以自行定义模板测试的方式，主要通过两个函数完成`glStencilFunc` and `glStencilOp`。我们先分析第一个

```c++
glStencilFunc(GLenum func, GLint ref, GLuint mask)
```

- `func`：设置决定片段保留还是丢弃的模板测试函数，可选项有`GL_NEVER`, `GL_LESS`, `GL_LEQUAL`, `GL_GREATER`, `GL_GEQUAL`, `GL_EQUAL`, `GL_NOTEQUAL` and `GL_ALWAYS`.
- `ref`：比较值
- `mask`：指定一个掩码，在测试比较它们之前，该掩码同时使用引用值和存储的模具值进行 AND。最初设置为所有 1

比如说，前面那个镂空的效果就可以通过这行代码实现：

```c++
glStencilFunc(GL_EQUAL, 1, 0xFF)
```

但是 `glStencilFunc` 只描述了 OpenGL 是否应该根据模板缓冲区的内容传递或丢弃片段，而不是我们如何实际更新缓冲区。这就是 `glStencilOp` 的用武之地。

---

现在让我们应用以下，看看如何使用模板测试来实现一个描边效果，步骤大致如下：

- 开启模板写入
- 在绘制需要描边的物体之前，将`stencil op`设置为`GL_ALWAYS`，将模板值都设置为1
- 绘制物体
- 关闭模板写入和深度测试
- 用另一个片段着色器，输出边缘颜色
- 再次绘制需要描边的物体，但是只绘制模板值不等于1的片段
- 开启深度测试，将`stencil func`重新设置为GL_KEEP

