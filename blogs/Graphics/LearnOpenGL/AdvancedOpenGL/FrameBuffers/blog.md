---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/AdvancedOpenGL/FrameBuffers/index.html
title: Frame Buffers
---

### Frame Buffers

---

目前，我们已经认识了几个OpenGL的屏幕缓冲区，包括color buffer、depth buffer、stencil buffer。这些缓冲区的组合存放在显存中被称作*framebuffer*的地方。OpenGL允许我们定义自己的framebuffer，也就是说，我们可以自行定义color、depth、stencil buffer

在OpenGL中，GLFW会在我们创建一个窗口时，自动为很么创建一个默认frame buffer。但是，除了默认的frame buffer以外，OpenGL也允许我们创建自己的framebuffer，这样我们就有了一个额外的渲染目标，它可以帮助我们实现一些高级的图形效果，比如后处理。

例如，我们可以先将场景绘制到我们自己的frame buffer中，然后使用framebuffer中的color buffer作为一个纹理，执行一些后处理操作，再将最终结果渲染到默认的framebuffer中。

---

与OpenGL中的其他object类似，我们使用`glGenFramebuffers`来创建一个framebuffer object

```c++
unsigned int fbo; // fbo as frame-buffer-object
glGenFramebuffers(1, &fbo);
```

接下来的操作我们应该很熟悉，将创建的framebuffer绑定给它所对应的object type，也就是`GL_FRAMEBUFFER`，从而将创建的framebuffer作为当前激活的framebuffer

```c++
glBindFramebuffer(GL_FRAMEBUFFER, fbo);
```

通过`GL_FRAMEBUFFER`函数的调用，接下来所有的*read*和*write* framebuffer的操作都会针对当前绑定的framebuffer。当然，我们也可以特定地为了read或者write去绑定一个framebuffer，对应的函数分别是`GL_READ_FRAMEBUFFER`和`GL_DRAW_FRAMEBUFFER`。

被`GL_READ_FRAMEBUFFER`绑定的framebuffer会被用来执行所有与read相关的函数，例如`glReadPixels`。被`GL_DRAW_FRAMEBUFFER`绑定的framebuffer则会作为渲染、clear或者其他写入操作的对象。

只是，我们当前的framebuffer还不是完整的，我们需要进一步满足以下条件，才可以使用framebuffer

- 必须给framebuffer附加至少一个buffer（color、depth、stencil）。因为我们至少需要一个buffer来存储渲染操作的结果
- 至少需要一个color buffer。因为我们至少需要一个地方来存储渲染的颜色信息
- 所有的附件都应该是完整的（保留了内存）。这条要求的本质是，每一个附件（即颜色、深度、和模板缓冲）必须在内存中分配了足够的空间来存储其数据。如果一个附件还没有分配内存，或者分配的内存不足以存储其数据，那么这个附件就被认为是不完整的。
- 所有的缓冲都需要有同样的数量的样本。在多重采样的上下文中，所有的缓冲都需要有同样的采样率，来保证最后合成的图像的质量。

OpenGL提供了一个函数`glCheckFramebufferStatus`来帮助我们确定一个framebuffer是否是完整有效的。具体的使用方法如下：

```c++
if(glCheckFramebufferStatus(GL_FRAMEBUFFER) == GL_FRAMEBUFFER_COMPLETE)
{
	// execute victory dance
}
```

此后所有的渲染操作都会将结果渲染到当前绑定的framebuffer中。并且因为我们自己定义的framebuffer并非默认的framebuffer，渲染相关的操作并不会影响窗口的视觉输出结果。我们将渲染到其他framebuffer的这一概念称为**off-screen rendering**。如果我们希望渲染相关的操作能够显示到屏幕上，我们需要将默认的framebuffer绑定回来：

```c++
glBindFramebuffer(GL_FRAMEBUFFER, 0);
```

记得删除我们自己定义的framebuffer object

```
glDeleteFramebuffers(1, &fbo);
```

在执行完整性检查之前，我们需要将一个或多个附件绑定到帧缓冲上。附件就是一个可作为帧缓冲器缓冲的内存位置，可以将它想象成一张图像。在创建附件时，我们有两种选择：纹理或渲染缓冲对象

---

当把一个纹理attach给framebuffer中时，所有的渲染指令都会被写入这个texture，只要它是一个正常的color/depth/stencil buffer。使用纹理作为framebuffer的attachment有一个优点，那就是渲染结果都会被存储进纹理中，我们可以在shader里轻松被使用

创建附加给framebuffer的纹理与创建普通的纹理的过程类似：

```c++
unsigned int texture;
glGenTextures(1, &texture);
glBindTexture(GL_TEXTURE_2D, texture);

glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, 800, 600, 0, GL_RGB, GL_UNSIGNED_BYTE, nullptr);

glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR); 
```

我们可以注意到，与普通纹理的创建不同的是，我们将GL_TEXTURE_2D的宽高设置为与屏幕宽高相同(并不是必须的)，并且`glTexImage2D`的`data`参数设置为`nullptr`。对于这个纹理而言，我们只是分配了内存，并没有填充它，我们会在渲染进framebuffer时填充它。另外，我们也并不会在意mipmap或者wrapping，因为我们不会使用到这两个概念。

完成了纹理的创建，我们需要将它实际上绑定给framebuffer，使用以下代码：

```c++
glFramebufferTexture2D(GL_FRAMEBUFFER. GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, texture, 0);
```

glFramebufferTexture2D这个函数用于将纹理绑定到framebuffer对象，从而作为framebuffer的附件，原型如下，我们依次分析它的参数

```c++
void glFramebufferTexture2D(GLenum target, GLenum attachment, GLenum textarget, GLuint texture, GLint level);
```

- `target`：指定帧缓冲的目标（`GL_FRAMEBUFFER`, `GL_READ_FRAMEBUFFER`, `GL_DRAW_FRAMEBUFFER`）。一般情况下，我们使用`GL_FRAMEBUFFER`
- `attachment`: 指定我们要附加的纹理类型。可以是颜色附件(`GL_COLOR_ATTACHMENTi`), 深度附件(`GL_DEPTH_ATTACHMENT`), 或者模板附件(`GL_STENCIL_ATTACHMENT`)。
- `textarget`: 指定纹理目标。对于2D纹理，这里就填`GL_TEXTURE_2D`
- `texture`: 要附加的纹理对象的ID
- `level`: 如果使用多级渐远纹理，则需要指定纹理的级别。通常情况下，我们填0，也就是使用基础级别的纹理

当然，除了color以外，我们还可以将depth texture和stencil texture绑定给framebuffer object。

如果要绑定depth，`attachment`需要改成`GL_DEPTH_ATTACHMENT`，这时，`glTexImage2D`中纹理的`format`和`internalformat` 也需要修改为相对应的`GL_DEPTH_COMPONENT`。

如果要绑定stencil，`attachment`需要改成`GL_STENCIL_ATTACHMENT `，这时，`glTexImage2D`中纹理的`format`和`internalformat` 也需要修改为相对应的`GL_STENCIL_INDEX`。

我们是否可以将depth和stencil作为一个texture绑定给framebuffer呢？当然可以！纹理中32位的值可以包含24位的深度值以及8位的模板值。我们可以将`glFramebufferTexture2D`的`attachment`写为`GL_DEPTH_STENCIL_ATTACHMENT` ，并修改对应的texture的格式。示例代码如下：

```c++
glTexture2D(GL_TEXTURE_2D, 0, GL_DEPTH24_STENCIL8, 800, 600, 0, GL_DEPTH_STENCIL, GL_UNSIGNED_INT_24_8, nullptr);

glFramebufferTexture2D(GL_FRAMEBUFFER, GL_DEPTH_STENCIL_ATTACHMENT, GL_TEXTURE_2D, texture, 0);
```

