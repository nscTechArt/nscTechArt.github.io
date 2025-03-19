---
title: Writing an efficient Vulkan renderer
date: 2024-10-10 21:42 +0800
categories: [Graphics, Vulkan Collections]
media_subpath: /assets/img/Graphics/vulkan collections/
math: false
---

### Abstract

Vulkan是一个高性能、跨平台的图形API。但是要实现一个高性能的Vulkan程序，需要我们深入了解Vulkan中的各种概念。我们将在这篇文章中探讨如内存分配、描述符集管理、命令缓冲区记录、管线屏障、Render Pass等主题。最后还会讨论一些优化CPU与GPU性能的方法。

---

### Memory management

在Vulkan中，我们需要手动分配内存以创建资源。但内存管理本身就是一个复杂的领域，所以在Vulkan开发中，我们通常会考虑在应用程序中集成[VulkanMemoryAllocator](https://github.com/GPUOpen-LibrariesAndSDKs/VulkanMemoryAllocator)，它为我们提供了一个通用的资源分配器，能够帮助我们解决一些内存管理上的细节问题。

本篇文章中关于内存管理的部分建立在不使用VMA库的基础上，但所涉及的理念对于VMA库集成的应用程序依然适用。

#### Memory heap selection

在Vulkan中创建资源时，我们需要选择一个堆从中分配内存。**Vulkan为我们提供了一些内存类型，每种类型都有定义该类型的内存的行为的标志符，以及定义了可用大小的堆索引。**

Vulkan中的大多数实现都会使用以下标识符中两个或三个的组合：

- `VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT` 

  - 通常表示GPU的内存，CPU不直接可见、不可访问
  - 从GPU中访问这种类型的内存速度最快
  - 通常用于Render Target、仅用于GPU的资源（例如computer buffer）、静态资源（例如纹理或geometry buffer）

- `VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT | VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT`

  - 在AMD设备上，这种类型的内存表示一个CPU可以直接写入的GPU内存

    - 最大为256MB

  - 非常适合用于CPU在每帧写入的数据，如uniform buffer，或动态的vertex/index buffer

  - > 我不确定这种类型的内存的适用性如何，我目前还么见过，也不知道是否支持Nvdia的显卡

- `VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT`

  - 表示CPU上的内存，但可以被GPU直接访问
  - 数据会通过PCI-E通常进行传输
  - 当设备不支持上一个类型的内存时，我们通常会使用此类型作为uniform buffer或动态的vertex/index buffer的内存来源
  - 通常会应用于staging buffer，而staging buffer用于向使用`VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT`分配的静态资源传递数据

- `VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT | VK_MEMORY_PROPERTY_LAZILY_ALLOCATED_BIT`
  - 表示内存是延迟分配的，只有在实际需要时才会分配物理内存，主要目的是节省物理内存
  - 通常用于那些不需要立即分配物理内存的资源，如稀疏资源或一些临时性的图像

当处理动态资源时，通常来说我们会分配host-visible而非device-local的内存。主要有两点原因：

1. **简化对于应用程序的管理：**由于内存是主机可见的，更新资源无需额外的步骤
2. **效率较高：**对于只读资源，比如uniform buffer，GPU可以对这些数据进行缓存，从而减少访问host-visible内存的开销，提高性能

而对于有高度随机访问需求的资源，例如动态纹理，我们最好通过`VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT`分配内存，然后使用具有`VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT`属性的staging buffer传递数据。这种做法与静态资源的处理方法类似。

同样，对于一些具有高度随机访问模式的大型的存储buffer，我们也需要进行这样的操作。因为我们需要考虑到PCI-E通道的传递速度较慢的事实，这也就意味着从GPU上访问主机内存存在一定的访问延迟。

#### Memory suballocation

某些API允许为每个资源执行一次内存分配的操作，而Vulkan对于内存分配却有着诸多限制

- 驱动程序对于独立的分配次数有限制
- 内存分配的操作本身的执行速度可能较慢
- 如果内存对齐不合理，可能会造成内存浪费
- 在命令缓冲区的提交期间，需要额外的开销来确保内存驻留

因此，在Vulkan使用子分配是很有必要的。例如，我们使用vkAllocateMemory进行较大的内存分配，然后在该内存中对对象进行子分配，从而有效地进行内存管理。更为关键的是，我们不仅需要管理内存的子分配，还需要确保内存的对齐要求是正确的。对齐问题是指不同类型的资源（如缓冲区和图像）在内存中的位置必须满足特定的对齐约束，否则可能会导致性能下降甚至错误除此之外，

除此之外，Vulkan 还有一个名为 `bufferImageGranularity` 的限制，这个限制规定了缓冲区（buffer）和图像（image）之间在内存中需要有多少间隔，或者说，它限制了buffer与图像资源在同一个内存分配中的相对位置，我们需要在各个分配之间添加额外的填充。简单来说，这个参数会限制你如何在同一块内存中分配缓冲区和图像，确保它们在物理上不会冲突，从而避免可能的内存访问问题。

有几种可以处理这个问题的方法：

- 最简单的办法当然是将buffer与图像分配在不同的内存中，从而完全避开这个问题。这样可以减少由于较小的对齐填充而导致的内部碎片，但如果后备分配太大（例如 256MB），则可能会浪费更多内存。
- 为每个分配跟踪资源类型，并且仅当先前或后续资源类型不同时，才让分配器添加必要的填充。这需要一个稍微更复杂的分配算法。
- 始终通过`bufferImageGranularity`来“过渡对齐”图像资源。这是因为图像通常一开始就具有较大的对齐要求。

#### Dedicated allocations

就像我们所提到的那样，在Vulkan应用程序中，我们会执行大量的分配，然后通过子分配在一个分配中纺织很多资源。但在某些GPU上，将某些资源作为一个专用的分配会带来更高的效率。这样资源通常来说是需要大量读写带宽的Render Target，具体则需要取决于硬件与驱动程序。

#### Mapping memory

当使用映射内存来获取一个CPU可见的内存指针时，Vulkan为我们提供了两种选项

- 在CPU需要写入数据之前就执行内存映射，当数据传递结束后，再取消映射
- 当分配完host-visible内存后，我们执行内存映射，然后直至应用程序结束才结束映射

通常来说，第二个选项是更好的选择，我们将其称为持久映射。因为我们需要考虑到，在某些驱动或硬件上，`vkMapMemory`是有一定开销的，而持久映射最大限度地减少了获取目标内存指针的时间，总体上简化了代码。

持久映射的唯一的缺点在于，对于Windows 7和AMD显式，它会占用我们在前面所提到的`VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT | VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT`内存。

---

### Descriptor sets

Vulkan与其他早期API相比，一个明显的特点是，Vulkan应用程序在将资源传递给着色器的方式上有更多的自由度。资源被分组到描述符集中，这些描述符集具有由应用程序指定的布局。并且每个着色器可以使用多个描述符集，这些描述符集可以单独进行绑定。

在应用程序端，我们需要确保CPU不会更新GPU正在使用的描述符集。同时，描述符集布局的设置也应该尽量满足CPU端的更新成本与GPU端的访问成本之间的平衡。

接下来我们将概述一些使用以及管理描述符集的方法，这些方法在可用性与性能层面上各不相同。

#### Mental model

描述符集可以看作是 GPU 内存中的一部分，其中存储着用于描述资源的二进制数据。当我们创建一个描述符集池时，实际上是分配了一块较大的内存，后续的描述符集会从这块内存中逐步分配。通过增量方式分配描述符，效率很高，但也存在内存不能部分回收的局限。通过 `vkResetDescriptorPool` 可以一次性重置整个池，这就类似于指针返回到起点。

Mental model是对 Vulkan 描述符工作机制的简化理解，忽略了一些细节，如动态缓冲区偏移和硬件的限制条件。尽管这只是可能的实现之一，但对计划 Vulkan 中描述符集的管理方式提供了有用的参考。

#### Dynamic descriptor set management

