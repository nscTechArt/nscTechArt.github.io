---
title: Introduction to Vulkan Render Passes
date: 2024-10-20 22:08 +0800
categories: [Graphics, Every Thing About Vulkan]
media_subpath: /assets/img/Graphics/LearnVulkan/
math: false
---

> 本篇博客翻译自[Introduction to Vulkan Render Passes | Samsung Developer](https://developer.samsung.com/galaxy-gamedev/resources/articles/renderpasses.html)

在Vulkan中，我们通过Render Pass以及subpass组织渲染的过程。本篇博客将会介绍这些概念，以及如何在Vulkan中使用它们。

### Render Passes

当GPU执行渲染工作时，它会配置一个或者多个render target，或者用Khronos的术语：framebuffer的附件。附件的大小与格式决定了如何在现代GPU的并行架构中配置图形任务。举个例子，在tiled-based渲染器中，我们将会通过附件来确定将图像划分为tiles的方式。

而在Vulkan中，我们通过render pass来组织framebuffer的一个或多个附件，，也就是说，通过render pass，我们将告诉Vulkan我们会使用到哪些附件，以及这些附件的使用方式。

---

### Subpasses

在正常的渲染过程中，fragment shader无法访问当前正在渲染的附件。然而，一些常见的渲染技术，例如延迟渲染，就依赖于在着色过程中访问之前渲染的结果。

这里有一段关于tiled-based的内容，我现在不太理解，暂时先贴上原文：For a tile-based renderer, the results of previous rendering can efficiently stay on-chip if subsequent rendering operations are at the same resolution, and if only the data in the pixel currently being rendered is needed (accessing different pixels may require access to values outside the current tile, which breaks this optimization). 

为了优化延迟渲染的这样的渲染技术，Vulkan将render pass中的渲染操作划分到subpass中。同一个render pass中的所有subpass共享相同的分辨率与tile排列，因为subpass可以访问之前subpass中的渲染结果。

Vulkan中的render pass可以包含一个或多个subpass。对于一些简单的渲染操作，一个subpass就可以胜任。

---

### Creating a `VkRenderPass`

在Vulkan中，我们使用`VkRenderPass`来描述一个render pass。当我们在command buffer中开始render pass时，我们需要传递这样的一个结构体。同时，render pass需要与一个匹配的`VkFrameBuffer`对象一起使用，后者表示在render pass执行期间作为附件的一组图像。

#### `vkCreateRenderPass`

与绝大多数的Vulkan创建函数一样，我们需要提供一个`VkRenderPassCreateInfo`结构体的指针。我们来逐一了解其中比较重要的成员变量：

```c++
typedef struct VkRenderPassCreateInfo {
    uint32_t                          attachmentCount;
    const VkAttachmentDescription*    pAttachments;
    uint32_t                          subpassCount;
    const VkSubpassDescription*       pSubpasses;
    uint32_t                          dependencyCount;
    const VkSubpassDependency*        pDependencies;
} VkRenderPassCreateInfo;
```

#### `VkAttachmentDescription`

一个附件对应着一个`VkImageView`对象，而对于该附件的描述`VkAttachmentDescription`则需要在创建render pass时就提供给`VkRenderPassCreateInfo`，用于正确地配置render pass。而render pass在执行过程所是用到的实际的图像则是通过`VkFrameBuffer`提供的。

一个render pass可以关联多个附件，这些附件可以用于MRT（multiple render target），也可以用于不同的subpasses。对于前向渲染来说，我们需要提供一个颜色附件与一个深度附件。

下面是`VkAttachmentDescription`中的参数的含义

- `format`：附件的图像格式
- `samples`：附件的采样数量（用于MSAA）
- `loadOp`：在渲染开始前，如何处理此附件
- `storeOp`：在渲染结束后，如何处理此附件
- `stencilLoadOp`/`stencilStoreOp`：特定于深度/模板附件
- `initialLayout`：在render pass中首次使用该附件时，附件的布局
- `finalLayout`：在render pass中使用后的附件布局

我们有必要了解在载入与存储时的`DONT_CARE`的操作。当载入时使用`DONT_CARE`，能够避免读取前一个framebuffer中的内容，也能够避免执行显式的清楚操作，从而降低性能开销。

我们可以考虑一个例子：使用两个render pass来绘制一个场景。在第一个render pass中，我们通过`STORE_OP_STORE`保留渲染结果，并且在第二个render pass中通过`LOAD_OP_LOAD`将其作为输入，当使用结束后，第二个render pass就可以对其使用`STORE_OP_DONT_CARE`。

---

