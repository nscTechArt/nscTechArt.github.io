---
title: 3D Graphics Rendering Cookbook Chapter 01
date: 2024-09-23 10:17 +0800
categories: [Graphics, 3D Graphics Rendering Cookbook]
media_subpath: /assets/img/Graphics/3dcookbook/
math: true
---

### OpenGL 4.6 with AZDO and Vulkan

AZDO（Approaching Zero Driver Overhead）是一种优化OpenGL性能的技术，它的核心思想是减少OpenGL驱动程序在CPU上的开销，避免频繁的状态切换和API调用，增加GPU的并行工作效率。

AZDO使用了一系列优化技术，包含：

1. **持久映射Persistent Mapping**：通过持久化映射VBO与PBO，可以避免反复的内存映射与解内存映射，从而减少CPU开销
2. **批量绘制调用Datching Draw Calls**：合并绘制指令，减少频繁的API调用，从而使得GPU能够批量处理多个对象
3. **使用高效的指令缓冲Indirect Drawing**：通过间接绘制命令（如glMultiDrawIndirect），减少频繁的API调用，让绘制命令一次性提交给GPU处理
4. **绑定点对象化Object-based Binding Points：**减少绑定状态变化的成本，通过引入对象（如VAO、UBO等）来绑定一系列属性，从而减少重复设置

有了AZDO的加持，现代OpenGL可以尝试接近vulkan的性能。但本质上Vulkan与OpenGL还是有着显著的区别的，因为Vulkan允许开发者在渲染之前预先配置和编译图形管线状态（如着色器、混合模式、深度测试等），这样在运行时可以减少状态切换的开销，从而提高性能。这是Vulkan的一大优势，它提供了更直接的硬件控制，减少了驱动层的开销。

---

### Essence of Model OpenGL

展开探讨AZDO之前，我们需要先了解现代OpenGL所具备一些扩展与特性。

> ARB代表Architecture Review Board，是一个推动OpenGL新功能与管理规范的组织

- OpenGL 4.2：

  **ARB_texture_storage**是一种改进纹理对象存储管理的机制，通过一次性分配所有 mipmap 层的存储空间，减少 API 调用、提高性能，并提供更加稳定的存储布局管理。而在传统OpenGL中，纹理存储是通过调用多个函数（如`glTexImage2D`）逐层逐次分配的，每个mipmap层需要单独定义，这样会增加CPU和驱动程序之间的开销。

- OpenGL 4.3：

  **ARB_multi_draw_indirect(MDI)**是一种更极端的批处理方式。与传统的实例化相比，它具备几个关键性的优势：

  - 批量绘制：允许一次性通过一个buffer提交多个绘制命令，而非每个物体调用一个draw call，从而减少API调用次数
  - 间接绘制：命令存储在GPU的buffer中，GPU能够直接读取buffer中的命令并执行。command buffer中包含了多个绘制命令的参数，如顶点数、实例数、偏移量等，这些命令可以在运行时动态生成
  - 异步执行：负责draw call的是GPU，那么CPU就可以在提交命令后立即执行其他任务，而不必等待绘制操作完成。

  在使用这一扩展时，我们需要调用`glMultiDrawArraysIndirect`和`glMultiDrawElementsIndirect`这两个API。

- OpenGL 4.4：

  **ARB_buffer_storage**旨在改进缓冲区对象（Buffer Object）的创建和管理方式。在传统的OpenGL中，我们通过glBufferData来管理缓冲区的存储，每次调用时，驱动程序可能会重新分配储存空间，并复制数据，这些都是潜在的性能问题。而**ARB_buffer_storage**通过引入`glBufferStorage`，允许应用程序明确指定缓冲区的存储模式，并提供了一些重要的性能优化和灵活性：

  - 一次性分配固定的存储，并且存储分配完成后是不可更改的，我们无法动态调整buffer的太小与存储，从而避免频繁的内存分配与复制开销
  - 持久性映射：`GL_MAP_PERSISTENT_BIT`允许应用程序将buffer持久地映射到客户端地址空间，而无需在每次映射和解除映射时重新建立映射，减少了CPU与GPU之间的同步开销，使得应用程序在CPU与GPU之间更高效地共享数据
  - 明确的访问标志：引入了`GL_MAP_READ_BIT`、`GL_MAP_WRITE_BIT`、`GL_MAP_COHERENT_BIT`等，指定buffer的访问模式，以提高性能。例如`GL_MAP_COHERENT_BIT`可以让CPU与GPU之间的内存同步更有效
  - 零拷贝优化：引入了`GL_CLIENT_STORAGE_BIT`，允许buffer存储在客户端内存中（如RAM），而非默认的GPU内存，这适用于需要频繁更新的数据，例如动态几何或动态顶点数据，避免了数据从 CPU 内存到 GPU 内存的频繁传输

  **ARB_enhanced_layouts**旨在增强GLSL中的layout的声明方式。

- OpenGL 4.5：

  **ARB_direct_state_access**旨在简化和优化 OpenGL 对象的操作方式。通过该扩展，开发者可以直接访问和修改 OpenGL 对象的状态，而不需要像传统 OpenGL 那样先绑定对象再进行操作。

- OpenGL 4.6：

  **GL_ARB_indirect_parameters**用于增强 GPU 执行 **间接绘制命令** 的能力。通过这个扩展，开发者可以在 GPU 上动态生成或修改绘制命令，而无需频繁地与 CPU 进行交互，从而提高了渲染的效率，尤其在批量绘制时大幅减少了 CPU 的负载。

  **GL_ARB_shader_draw_parameters**旨在为着色器提供关于当前绘制调用的额外信息，特别是与实例化和多次绘制相关的参数。通过该扩展，开发者可以在着色器中访问与绘制调用相关的参数，从而使得渲染操作更加灵活和高效。

  **ARB_gl_spirv**允许 OpenGL 应用程序使用 **SPIR-V** 作为着色器的中间表示语言。

---

