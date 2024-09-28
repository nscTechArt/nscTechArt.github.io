---
title: Vulkan Core Concepts
date: 2024-09-28 14:59 +0800
categories: [Graphics, Modern Vulkan Cookbook]
media_subpath: /assets/img/Graphics/LearnVulkan/
math: false
---

### Understanding Vulkan's memory model

在Vulkan中，内存的管理与分配至关重要。但是Vulkan只负责决定分配内存的确切内存地址，除此以外所有的细节都由应用程序负责。也就是说，作为开发者，我们需要自行管理内存类型、内存大小、对齐方式以及任何子分配。这种设计方式为应用程序提供了更大程度的内存管理控制，允许开发者针对特定用途优化程序。

在本小节中，我们将会提供一些关于内存类型的基本信息，同时总结如何分配内存，并与资源绑定

#### Getting ready

显卡分为两种，集成显卡与独立显卡。集成显卡会与CPU共享内存，如下图所示：

![](B18491_02_02.jpg)

独立显卡有专属的内存，称为device memory，与CPU使用的内存host memory相互独立，如下图所示

![](B18491_02_01.jpg)

Vulkan提供了不同类型的内存：

- **Device-local memory：**
  - 为GPU的使用而优化的内存类型，是显卡的本地内存。它通常比主机可见内存更快，但是无法从CPU中访问。
  - 通常来说，render target, storage images和buffer这些资源都存储在device-local内存中。
- **Host-visible memory：**
  - CPU和GPU都可以访问
  - 虽然它的速度通常比设备本地内存慢，但它可以有效地支持GPU与CPU之间的数据传输。
  - 在非集成显卡上，GPU到CPU的数据读取会通过PCI-E通道进行，这种传输相对较慢，但对于需要频繁更新数据的场景来说，仍然是必要的。
  - 这种内存常用于设置暂存缓冲区（staging buffers），将数据存储在这里以便之后转移到设备本地内存；同时也用于统一缓冲区（uniform buffers），这些缓冲区会不断地从应用程序更新数据。
- **Host-coherent memory：**
  - 这类内存与主机可见内存类似，但能保证 GPU 和 CPU 之间的内存一致性。 这种类型的内存通常比设备本地内存和主机可见内存都要慢，但对于存储 GPU 和 CPU 都需要频繁更新的数据非常有用。

下图总结了上述三种类型的内存。

![](B18491_02_03.jpg)

图像通常来说使用的是设备本地内存，而buffer可以是上述的任意一种类型

#### How to do it...

创建并将数据更新到一个buffer上的步骤通常是这样的：

1. 使用`VkBufferCreateInfo`结构体和函数`vkCreateBuffer`，创建一个`VkBuffer`对象
2. 调用`vkGetBufferMemoryRequirements`，根据buffer的属性获取相应的内存需求。比方说，设备可能会要求使用特定的对齐方式，这可能会影响为容纳buffer中的内存而分配的必要大小
3. 创建一个`VkMemoryAllocateInfo`结构体，指定为内存分配的大小以及内存的类型，然后再调用`vkAllcateMemory`执行实际的内存分配
4. 调用`vkBindBufferMemory`，将buffer对象与分配的内存绑定
5. 将数据传递到buffer中，需要根据buffer类型分为两种情况
   1. 如果buffer对于主机是可见的，那么就可以通过`vkMapMemory`将指针映射到buffer上，然后拷贝数据，最后在使用`vkUnmapMemory`取消映射。
   2. 如果是设备本地的buffer，我们需要先将数据拷贝到staging buffer中，然后再使用`vkCmdCopyBuffer`，完成stage buffer到目标buffer的数据传递

可见，使用buffer的过程是较为复杂的，所以我们可以使用VMA这个开源库减少一些工作量。它为Vulkan中的内存管理提供了一种方便高效的方法。 它提供了一个高级接口，抽象了内存分配的复杂细节，让您从手动内存管理的负担中解脱出来。

---

### Instantiating the VMA library

要使用VMA，我们首先需要创建一个VMA库实例，并在 `VmaAllocator` 类型的变量中存储一个句柄。

#### Getting ready

[GPUOpen-LibrariesAndSDKs/VulkanMemoryAllocator: Easy to integrate Vulkan memory allocation library (github.com)](https://github.com/GPUOpen-LibrariesAndSDKs/VulkanMemoryAllocator)

#### How to do it...

创建一个VMA库实例需要实例化两个不同的结构体，一个结构存储 VMA 查找其他函数指针所需的 API 函数指针，另一个结构提供物理设备、设备和用于创建分配器的实例

```c++
VKPhysicalDevice physicalDevice;
VkDevice device;
VkInstance isntance;

const uint32_t apiVersion = VK_API_VERSION_1_3;

const VmaVulkanFunctions vulkanFunctions = 
{
    .vkGetInstanceProcAddr = vkGetInstanceProcAddr,
    .vkGetDeviceProcAddr = vkGetDeviceProcAddr,
#if VMA_VULKAN_VERSION >= 1003000
    .vkGetDeviceBufferMemoryRequirenments = vkGetDeviceBufferMemoryRequirements,
    .vkGetDeviceImageMemoryRequirements = vkGetDeviceImageRequirements,
#endif
};

VmaAllocator allocator = nullptr;
const VmaAllocatorCreateInfo allocaInfo = 
{
    .physicalDevice = physicalDevice,
    .device = device,
    .pVulkanFunctions = &vulkanFunctions,
    .snstance = instance,
    .vulkanApiVersion = apiVersion,
};

vmaCreateAllocator(&allocaInfo, &allocator);
```

分配器需要指向一些 Vulkan 函数的指针，这样它才能根据你想使用的功能工作。 在前面的例子中，我们只提供了分配和取消分配内存的最基本功能。 一旦使用 `vmaDestroyAllocator` 销毁上下文，就需要释放分配器。

---

### Creating buffers

在Vulkan中，buffer是一个存储数据的连续内存块。数据可以是顶点、索引、uniform，等等。

与buffer关联的内存是在buffer创建后才分配的。

下表总结了最重要的几个buffer的用法，以及对应的访问类型

| Buffer Type     | Access Type | Uses                          |
| --------------- | ----------- | ----------------------------- |
| Vertex or Index | Read-only   |                               |
| Uniform         | Read-only   | Uniform data storage          |
| Storage         | Read/write  | Generic data storage          |
| Uniform texel   | Read/write  | Data is interpreted as texels |
| Storage texel   | Read/write  | Data is interpreted as texels |

创建buffer很简单，但是在开始创建buffer之前，了解buffer的类型及其要求会有所帮助。在本小节中，我们将会实现一个创建buffer的模板

#### Getting ready

在本系列博客中，我们通过`VulkanCore::Buffer`类来管理Vulkan中的buffer，即创建buffer以及向buffer中更新数据的，此外还提供了从stagin buffer向设备本地的内存传递数据的函数，我们会在本篇博客中逐一介绍

#### How to do it...

通过VMA创建buffer很简单

1. 我们需要提供标志（使用0作为标识值在大多数情况下都是正确的），以byte为单位的buffer的大小，buffer的用法。这些信息可以汇总在`VkBufferCreateInfo`结构体中：

   ```c++
   VkDeviceSize size; // the requested size of the buffer
   VmaAllocator allocator; // valid VMA Allocator
   VkUsageBufferFlags use; // transfer src/dsr/uniform/ssbo
   VkBuffer buffer;
   VkBufferCreateInfo createInfo = 
   {
       .sType = VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO,
       .pNext = nullptr,
       .flags = {},
       .size = size,
       .usage = use,
       .sharingMode = VK_SHARING_MODE_EXCLUSIVE,
       .queueFamilyIndexCount = {},
       .pQueueFamilyIndices = {},
   };
   ```

   还有一个额外的结构体：

   ```c++
   const VmaAllocationCreaterFlagsBits allocCreateInfo = 
   {
   	VMA_ALLOCATION_CREATE_MAPPED_BIT, VMA_MEMORY_USAGE_CPU_ONLY
   };
   ```

2. 然后，我们调用vmaCreateBuffer获取一个buffer以及buffer分配的内存的句柄

   ```c++
   VmaAllocation allocation; // needs to live until the buffer is desctoried
   VK_CHECK(vmaCreateBuffer(
   	allocator, &createInfo, &allocCreateInfo, &buffer, &allocation, nullptr));
   ```

3. 这一步是可选的，但是有助于优化和debug

   ```cpp
   VmaAllocationInfo allocationInfo;
   vmaGetAllocationInfo(allocator, allocation, &allocationInfo);
   ```

---

### Uploading data to buffers

将数据从应用程序中上传到GPU上的过程取决于buffer的类型。对于主机可见的buffer来说，我们可以使用memcpy直接将数据拷贝到buffer上。而对于设备本地的buffer，我们需要一个一个对CPU和GPU均可见的staging buffer来完成数据的传递。

#### Getting ready

如果不是很理解，最好回顾一下

#### How to do it...



