---
title: 3D Graphics Rendering Cookbook Chapter 03
date: 2024-09-23 22:51 +0800
categories: [Graphics, 3D Graphics Rendering Cookbook]
media_subpath: /assets/img/Graphics/3dcookbook/
math: true
---

### Working With Direct State Access (DSA)

在现代 OpenGL 中，直接状态访问（Direct State Access, DSA）提供了一种更加直观和简洁的方式来操作对象，比如纹理、缓冲区等，而不需要像早期 OpenGL 那样先绑定对象到上下文（绑定点），然后再执行操作。DSA 可以直接对对象进行操作，避免了频繁的绑定和解绑操作，提升了代码的可读性和性能。

DSA函数根据对象分为下面几类：

- Texture
- Framebuffer
- Buffer
- Transform feedback
- Vertex Array
- Sampler
- Query
- Program

我们会逐一了解每个类型在DSA下的使用方式，从而更好地理解DSA这个特性。

#### Texture

1. 使用DSA，可以通过`glCreateTextures`来创建一个或多个texture对象，并且会在创建时中指定纹理目标，而不需要像传统OpenGL中先绑定到GL_TEXTURE_2D等目标：

   ```c++
   GLuint texture;
   glCreateTextures(GL_TEXTURE_2D, 1, &texture);
   ```

2. 在DSA中，可以直接调用glTextureParameter来设置纹理参数，而无需先绑定纹理对象：

   ```c++
   glTextureParameteri(texture, GL_TEXTURE_WRAP_S, GL_REPEAT);
   glTextureParameteri(texture, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
   ```

3. 在传统OpenGL中，我们需要通过`glTexImage2D`等函数指定纹理数据，而在DSA中，我们使用`glTextureStorage2D`来分配存储，使用`glTextureSubImage2D`来更新纹理数据

   ```c++
   glTextureStorage2D(texture, 1, GL_RGBA8, width, height);
   glTextureSubImage2D(texture, 0, 0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, data);
   ```

4. 尽管DSA可以减少绑定的操作，但是在实际渲染中，纹理仍然需要绑定到纹理单元。在传统OpenGL中，我们使用glActiveTexture与glBindTexture进行绑定，而在DSA中，通过glBindTextureUnit就可以直接将纹理绑定到指定的纹理单元：

   ```c++
   glBindTextureUnit(0, texture);
   ```

5. 在生成mipmap时，DSA也可以省略掉绑定的过程：

   ```c++
   glGenterateTextureMipmap(GLuint texture);
   ```

这里是一个使用DSA绘制纹理的例子：

#### Buffer
