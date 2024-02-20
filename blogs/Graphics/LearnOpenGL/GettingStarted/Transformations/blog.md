---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/GettingStarted/Transformations/index.html
title: Transformations
---

### Transformations

---

目前位置，我们已经实现了让物体出现在OpenGL窗口中、上色、使用纹理，但是现在这些物体都是静态的，我们可以尝试通过改变它们的顶点并在每一帧重新配置它们的缓冲区来使它们移动，但这很麻烦，并且需要相当多的处理能力。有更好的方法来转换对象，那就是使用（多个）矩阵对象。这篇博客，我们就逐步深入地去了解向量、矩阵以及变换。

由于一些概念和知识过于基础，本篇博客会相较于[原文](https://learnopengl.com/Getting-started/Transformations)省略一部分。

---

OpenGL没有自带任何的矩阵和向量知识，所以我们必须定义自己的数学类和函数。在教程中我们更希望抽象所有的数学细节，使用已经做好了的数学库。幸运的是，有个易于使用，专门为OpenGL量身定做的数学库，那就是GLM。

我们主要会用到以下三个来自GLM的头文件：

```c++
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>
```

---

如何将矩阵传递给shader呢？GLSL内置了`mat4`的数据类型，我们让顶点着色器接收一个`uniform mat4`的变量

```glsl
#version 330 core
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec2 aTexCoord;

out vec2 TexCoord;

uniform mat4 transform;

void main()
{
    gl_Position = transform * vec4(aPos, 1.0f);
    TexCoord = vec2(aTexCoord.x, 1.0 - aTexCoord.y);
}
```

C++中需要这样操作：

```c++
unsigned int transformLoc = glGetUniformLocation(ourShader.ID, "transform");
glUniformMatrix4fv(transformLoc, 1, GL_FALSE, glm::value_ptr(trans));
```

首先通过`glGenUniformLocation`查询`uniform mat4`的地址，然后用有`Matrix4fv`后缀的`glUniform`函数把矩阵数据发送给Shader，这个函数包括了多个矩阵，我们逐一分析，首先是函数的定义

```c++
void glUniformMatrix4fv(GLint location, GLsizei count, GLboolean transpose, const GLfloat *value);
```

- `location`: 这是`uniform`变量在着色器程序中的位置。你可以使用 `glGetUniformLocation` 函数来获取这个位置。
- `count`: 需要修改的矩阵数量。对于单个矩阵，这个值应该是1。
- `transpose`: 指定传递的矩阵是否需要转置。在OpenGL中，矩阵默认是以列为主的，如果你的矩阵是行主的，你需要把这个值设置为 `GL_TRUE`，OpenGL会自动把它转置成列主矩阵。否则，应设置为 `GL_FALSE`。
- value: 这是你要传递的矩阵的值。它应该是一个指向你的矩阵数据的指针。

前三个变量都好说，最后一个是真正的矩阵数据，但是GLM并不会把它处理的矩阵存储为OpenGL所接受的形式，所以还需要用GLM自带的函数`value_ptr`来变换这些数据。

