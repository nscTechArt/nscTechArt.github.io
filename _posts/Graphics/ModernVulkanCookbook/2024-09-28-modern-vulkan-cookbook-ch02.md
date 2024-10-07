---
title: Working with Modern Vulkan
date: 2024-09-28 14:59 +0800
categories: [Graphics, Modern Vulkan Cookbook]
media_subpath: /assets/img/Graphics/LearnVulkan/
math: false
---

### Understanding Vulkan's memory model

在Vulkan中，内存的管理与分配至关重要。**但是Vulkan只负责决定分配内存的确切内存地址，除此以外所有的细节都由应用程序负责**。也就是说，作为开发者，我们需要自行管理内存类型、内存大小、对齐方式以及任何子分配。这种设计方式为应用程序提供了更大程度的内存管理控制，允许开发者针对特定用途优化程序。

在本小节中，我们将会提供一些关于内存类型的基本信息，同时总结如何分配内存，并与资源绑定

#### Getting ready

显卡分为两种，集成显卡与独立显卡。集成显卡会与CPU共享内存，也就是Host Memory，如下图所示：

![](B18491_02_02.jpg)

独立显卡有专属的内存，称为device memory，与CPU使用的内存host memory相互独立，如下图所示

![](B18491_02_01.jpg)

Vulkan提供了三种不同类型的内存：

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

在Vulkan中，buffer是一个存储数据的连续内存块。这里的数据可以是顶点、索引、uniform，等等。

在 Vulkan 中，`VkBuffer` 对象本身确实只是一个元数据对象，它描述了缓冲区的类型、大小和用途等信息，但不直接包含数据。实际的数据存储在分配的内存中，通过 `vkAllocateMemory` 和 `vkBindBufferMemory` 函数将内存绑定到 `VkBuffer` 对象。

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

2. 然后，我们调用`vmaCreateBuffer`获取一个buffer以及buffer分配的内存的句柄

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

将数据从应用程序中上传到GPU上的过程取决于buffer的类型。对于host-visible buffer来说，我们可以使用`memcpy`直接将数据拷贝到buffer上。而对于local-device buffer，我们需要一个对CPU和GPU均可见的staging buffer来完成数据的传递。

#### Getting ready

如果不是很理解，最好回顾一下[Understanding Vulkan memory](https://lovewithyou.tech/posts/modern-vulkan-cookbook-ch02/#understanding-vulkans-memory-model)

#### How to do it...

我们分情况讨论

**对于主机可见的内存**，只需要`vmaMapMemory`获取指向目标buffer的指针，然后通过`memcpy`拷贝数据即可。这个操作是同步的，所以当`memcpy`返回后，我们就可以取消映射。此外，当我们创建host-visible buffer时，我们可以立即对其进行映射，保持映射状态，直至该buffer被销毁。这样的做法可以减少映射操作的内存开销。

```c++
VmaAllocator allocator; // valid VMA allocator
VmaAllocation allocation; // valiad VMA allocation
void* data; // data to be uploaded
size_t size; // size of data in bytes
void* map = nullptr;

VK_CHECK(vmaMapMemory(allocator, allocation, &map));
memcpy(map, data, size);
vmaUnmapMemory(allocator, allocation);
VK_CHECK(vmaFlushAllocation(allocator, allocation, offset, size));
```

**对于设备本地的内存**，我们需要先将数据拷贝到staging buffer上，然后再通过`vkCmdCopyBuffer`将数据从staging buffer拷贝到我们的目标buffer中，这一步操作需要使用到command buffer。过程如下图所示：

![](B18491_02_04.jpg)

```c++
VkDeviceSize srcOffset;
VkDeviceSize dstOffset;
VKDeviceSize size;
VkCOmmandBuffer commandBuffer; // Valid Command Buffer
VkBuffer stagingBuffer;
VkBuffer buffer; // a device-local buffer
VkBufferCopy region(srcOffset, dstOffset, size);
VkCmdCopyBuffer(commanBuffer, stagingBuffer, buffer, 1, &region);
```

---

### Creating a staging buffer

创建一个staging buffer的过程与创建一个普通buffer的过程类似，只是我们需要指定一个标志，表示此buffer是主机可见的。

#### Getting ready

在[Creating buffers](https://lovewithyou.tech/posts/modern-vulkan-cookbook-ch02/#creating-buffers)这一小节中，我们已经了解了如何创建一个buffer对象，所以本小节我们只需要了解创建staging buffer所需要的标志和参数即可

#### How to do it...

我们需要将`VkBufferCreateInfo::usage`包含`VK_BUFFER_USAGE_TRANSFER_SRC_BIT`，因为在`vkCmdCopyBuffer`这个命令中，staging buffer会作为数据的来源

```c++
const VkBufferCreatInfo stagingBufferInfo = 
{
	.sType = VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO,
    .size = size,
    .usage = VK_BUFFER_USAGE_TRANSFER_SRC_BIT,
};

const vmaAllocationCreateInfo stagingAllocationCreateInfo = 
{
    .flags = VMA_ALLOCATION_CREATE_HOST_ACCESS_SEQUENTIAL_WRITE_BIT | VMA_ALLOCATION_CREATE_MAPPED_BIT,
    .usage = VMA_MEMORY_USAGE_CPU_ONLY,
};

const VmaAllocationCreateFlagsBits allocCreateInfo = 
{
    VMA_ALLOCATION_CREATE_MAPPED_BIT,
    VMA_MEMORY_USAGE_CPU_ONLY,
};

VmaAllocation allocation;
VK_CHECK(vmaCreateBuffer(allocator, &stagingBufferInfo, &allocCreateInfo, &buffer, &allocation, nullptr);
```

---

### How to avoid data races using ring buffers

当buffer需要每帧更新时，我们就可能面临数据竞赛的风险，如下图所示

![](B18491_02_05.jpg)

数据竞赛指的是，程序中的多个线程同时处理一个共享的数据点，并且至少有一个线程在执行写入的操作。由于操作顺序不可预测，这种并发访问会导致不可预见的行为。 

以存储mvp矩阵的uniform buffer为例，这个buffer会在每帧更新。此时，就有可能发生当应用程序试图更新MVP矩阵时，GPU还在访问其中的数据来完成渲染的情况。

#### Getting ready

目前来说，处理同步是Vulkan中最为复杂的一部分。如果我们在程序中滥用semaphore，fence或barrier等同步元素，就有可能导致无法充分利用Vulkan中CPU和GPU并行运行的能力。

所以，在继续之前，最好回顾[Understanding synchronization  in the swapchain](https://lovewithyou.tech/posts/modern-vulkan-cookbook-ch01/#understanding-synchronization-in-the-swapchain)这一小节。

我们会在`EngineCore::RingBuffer`这类中实现环形buffer，该buffer具有可配置的子buffer数量，所有的子buffer都是主机可见的，同时能够一直位置映射状态，以便于访问

#### How to do it...

避免数据竞赛的方法有很多，但最简单的方法是建立一个环形buffer，它包含了数个buffer（或其他任何资源），数量与渲染管线中同时处理的帧数量相等。下图显示了使用两个buffer时的情况。一旦第一个command buffer提交，然后在GPU中处理时，应用程序就可以自由地处理其中没有被GPU使用的buffer

![](B18491_02_06.jpg)

虽然这是一个简单的方案，但是也存在一些注意事项。如下图所示，环形缓冲区包含了多个子分配（sub-allocations），每个子分配分别存储了视图矩阵、模型矩阵、视口矩阵。这个缓冲区用于存储不同帧数据的多个副本，每个副本都初始化为单位矩阵。在渲染管线中，每一帧的缓冲区可能会部分更新，例如只更新模型矩阵或者视口矩阵，而不更新其他矩阵。

![](B18491_02_07.jpg)

我们来逐帧解释：

**初始化（T0 时刻）：**
在缓冲区创建时，`Buffer 0`、`Buffer 1` 和 `Buffer 2` 中的所有矩阵都被初始化为单位矩阵。

**Frame 0**（第一帧）：
在第一帧中，`Buffer 0` 是当前使用的缓冲区。模型矩阵被更新为包含一个平移变换 `(10, 10, 0)`，因此 `Buffer 0` 的模型矩阵变为 `[10, 10, 0]`。但此时，视图矩阵和视口矩阵保持不变。

**Frame 1**（第二帧）：
在第二帧中，环形缓冲区从 `Buffer 0` 切换到 `Buffer 1`，并且视口矩阵被更新，视口矩阵的值变为 `[50, 50]`。然而，由于 `Buffer 1` 是初始化的单位矩阵，当只更新视口矩阵时，`Buffer 1` 中的模型矩阵和视图矩阵仍然保持单位矩阵。这就导致了不同步问题——在 `Buffer 1` 中，模型矩阵没有继承 `Buffer 0` 中的更新（`translate(10, 10, 0)`），从而与 `Buffer 0` 中的状态不一致。

**最终，这种不同步会导致渲染时使用错误的模型变换，从而产生渲染错误。**为了解决部分更新带来的不同步问题，每次更新一个缓冲区时，首先需要将前一个缓冲区的内容拷贝到当前缓冲区中。例如，在 Frame 1 中更新视口矩阵时，应该首先将 `Buffer 0` 的内容复制到 `Buffer 1` 中，然后再更新 `Buffer 1` 的视口矩阵。这确保了所有子分配（矩阵）始终是同步的，不会丢失之前的任何更新。

---

### Setting up pipeline barriers

在Vulkan中，处理command buffer时，可以对命令进行重新排序，但是要受到某些限制。这就是所谓的command buffer重排序，它允许驱动程序优化命令的执行顺序，从而有助于提高性能。

好在 Vulkan 提供了一种称为管道屏障的机制，可以确保以正确的顺序执行相关命令。 它们用于明确指定命令之间的依赖关系，防止它们被重新排序，以及它们在哪些阶段可能会重叠。 

#### Getting ready

考虑下面两个依次发出的调用，第一个命令写入到一个颜色附件中，第二个命令需要从上个上一个颜色附件中读取颜色。

```c++
vkCmdDraw(...); // draws into color attachment 0
vkCmdDraw(...); // reads from color attachment 0
```

下图可以帮助我们理解GPU是如何处理这两个命令的。如图，命令是从上向下处理，而渲染管线的进程是从左到右。时钟周期是一个宽泛的术语，因为处理过程可能需要多个时钟周期，但是已经可以大致为我们表述清楚命令执行的先后顺序了。

![](B18491_02_08.jpg)

在这个例子中，第二个`vkCmdDraw`从C2开始执行，晚于第一个`vkCmdDraw`。但是从图中可以看出，C1作为时间偏差是不够的，第二个`vkCmdDraw`需要在片段着色器阶段读取来自第一个`vkCmdDraw`要写入的颜色附件，但是第一个`vkCmdDraw`还在Early Fragment的阶段。可以看出，如果没有设置同步，就会导致这样的数据竞赛发生。

管线屏障是一种指令，它被记录在命令缓冲区中，用于控制 GPU 命令的执行顺序。它指明了哪些管线阶段必须完成，确保在执行后续命令之前，前面的命令已经完全执行。这对于确保资源的一致性和防止数据冲突非常重要。同时，它定义了两个同步范围：

- **第一同步范围**（first synchronization scope）：在管线屏障之前记录的所有命令都属于这个范围。也就是说，在这些命令执行完毕之前，管线屏障会确保后续的操作不会开始。
- **第二同步范围**（second synchronization scope）：管线屏障之后记录的所有命令都属于这个范围。这些命令只能在第一范围中的命令执行完毕后才会被处理。

此外，管线屏障允许开发者指定更精确的条件，控制第二个作用域中的命令在何种情况下开始执行。也就是说，可以选择哪些命令需要等待第一作用域中的命令完成。第二个作用域中的命令不必完全等到第一个作用域中的所有命令都执行完毕，只要满足管线屏障中定义的特定条件，它们就可以立即开始处理。这种机制提高了渲染和计算的并行性，使得 GPU 资源的利用更加高效。

回到我们的例子中，第一个作用域中的第一个指令需要写入颜色附件后，第二个绘制调用才能访问该附件。但是第二个绘制调用不需要等到颜色附件被写入后才开始，而是可以在调用时就即可执行，只要它的片段着色器阶段发生在颜色附件写入完成后即可 ，如下图所示：

![](B18491_02_09.jpg)

Vulkan提供了三种类型的屏障

1. **内存屏障：**全局性的屏障，可以应用于第一范围和第二范围的所有指令
2. **buffer内存屏障：**只适用于访问buffer部分内容的命令
3. **图像内存屏障：**只适用于访问图像子资源的命令。这是一种相当重要的屏障，它可以用在图像布局的转换上。例如，在生成mipmap时，从一个层级blit到下一个层级，不同的层级之间需要设置正确的布局：前一个层级的布局需要为`VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL`，表示该层级需要被读取，而下一个层级的布局需要为`VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL`，表示作为写入的对象。

#### How to do it...

管线屏障通过`vkCmdPienlineParrirer`命令记录，下面这段代码展示了如何为什么前面提到的例子创建屏障

```c++
const VkImageSubresourceRange subresource = 
{
    .aspectMask = .baseMipLevele = 0,
    .levelCount = VK_REMAINING_MIP_LEVElS,
    .baseArrayLayer = 0,
    .layerCount = 1,
};

const VkImageMemoryBarrier imageBarrier = 
{
    .sType = VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER,
    .srcAccessMask = VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT_KHR,
    .dstAccessMask = VK_ACCESS_2_SHADER_READ_BIT_KHR,
    .oldLayout = VK_IMAGE_LAYOUT_ATTACHMENT_OPTIMAL,
    .newLayout = VK_IMAGE_LAYOUT_READ_ONLY_OPTIMAL,
    .srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED,
    .dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED,
    .image = image,
    .subresourceRange = &subresource,
};

vkCmdPipelineBarrire(
    commandBuffer, 
    VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
	VK_PIPELINE_STAGE_FRAGMENT_SHADER_BIT, 
	0, 0, nullptr, 0, nullptr, 1, &memoryBarrire);
```

最后，我们需要在两个绘制调用之间记录屏障

```c++
vkCmdDraw(...); // draws into color attachment 0
vkCmdPipelineBarrier(...);
vkCmdDraw(...); // reads from color attachment 0
```

---

### Creating image(textures)

绝大多数图像用于存储二位数据。与buffer不同，图像具有优化内存布局位置的优势。这是因为GPU中有固定功能的纹理单元或者采样器，能够从图像中读取纹理数据，并应用过滤或其他操作生成最终的颜色值。图像可以有不同的格式，如RGB，RGBA，BRGA等

与buffer类似，在Vulkan中，图像对象只是元数据，它的数据单独存储，如下图所示

![](B18491_02_10.jpg)

Vulkan中的图像不可以直接访问，而是需要通过image view。image view指定了子资源范围（如颜色或深度），mip级别，数组层访问。

图像有一个至关重要的性质：图像的布局。它用于指定Vulkan中的图像的预期用途，例如是否应该将其用作传输操作的源或目标，或者渲染的颜色附件或深度附件，或者用作着色器的读写资源。设置正确的图像布局非常重要，因为它能够确保GPU根据预期用途高效地访问和处理图像数据，使用错误的图像布局会导致性能问题或渲染伪像，并可能导致未定义的行为。 

常见的图像布局包括：

- `VK_IMAGE_LAYOUT_UNDEFINED`
- `VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL`
- `VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL`
- `VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL`

另外值得一提的是，图像的布局转换是`vkCmdPipeBarrier`的一部分

在本小节中，我们将了解如何创建一个`VkImage`对象

#### Getting ready

在本系列博客中，我们将复杂的图像和`VkImageView`的管理封装在`VulkanCore::Texture`类中，还有一些其他的细节，可以在源码中查看。

#### How to do it...

填充`VkImageCreateInfo`的代码这里就省略了

我们声明一个`VmaAllocationCreateInfo`，表示这个图像是一个device-only的图像

```c++
const VmaAllocaitionCreateInfo allocInfo = 
{
    .flags = VMA_ALLOCATION_CREATE_DEDICATED_MEMORY_BIT,
    .usage = VMA_MEMORY_USAGE_AUTO_PREFER_DEVICE,
    .priority = 1.0f,
};
VK_CHECK(vmaCreateImage(vmaAllocator, &imageInfo, &allocCreateInfo, &image, &vmaAllocation, nullptr));
```
创建`VkImageView`的过程较为简单直白，本篇博客就直接忽略了

---

### Creating a sampler

Vulkan中，sampler是一个较为复杂的对象。它是shader执行与图像数据之间的重要桥梁，还管理了图像的插值，过滤，寻址模式，mipmapping等

#### Getting ready

我们将sampler的创建与管理封装在`VulkanCore::Sampler`中。

#### How to do it...

sampler的属性定义了图像在管线（通常是shader中）的解释方式，创建sampler的也很简单，实例化一个`VkSamplerCreateInfo`结构体，并调用`vkCreateSampler`。这里就不再展示相关代码了

---

### Providing shader data

从应用程序中提供shader中使用的数据是Vulkan中最复杂的部分之一，在本小节中，我们讲了解如何提供着色器中使用的数据，例如纹理，buffer，sampler

#### Getting ready

我们通过关键字layout，以及限定符set和binding来指定shader所使用的资源，例如：

```glsl
layout (set = 0, binding = 0) uniform Transforms
{
    mat4 model;
    mat4 view;
    mat4 projection;
} MVP;
```

每个资源通过binding表示，set则表示一组binding。需要注意的是，一个binding并非只能表示一个资源，实际上也可以表示一个相同类型的资源组成的数组

#### How to do it...

向着色器中提供资源作为着色器的输入包含了很多步骤：

1. 使用描述符集布局指定set和binding。这一步并不会通过set与binding与实际的资源绑定，它只是定义一个set中binding的数量和类型
2. 绑定一个管线布局，它描述了管线中会使用哪些sets
3. 创建一个描述符池，用于提供描述符集的实例。 描述符池包含一个可提供绑定数量的列表，按绑定类型（纹理、采样器、着色器存储缓冲区 (SSBO)、统一缓冲区）分组。
4. 调用`vkAllocateDescriptorSets`，用于从描述符池中分配描述符集
5. 使用`vkUpdateDescriptorSets`将资源绑定到bindings上，这一步是实际上的资源绑定
6. 在渲染过程中，使用vkCmdBindDescritorSet，将描述符集及其bindings绑定到管线上。此步骤可让当前流水线中的着色器使用上一步骤中与描述符集/绑定绑定的资源。

我们会在下一个小节详细讨论每个步骤的执行细节

---

### Specifying descriptor sets with descritor set layouts

我们考虑下面这段GLSL代码，其中指定了一些资源：

```glsl
struct Vertex
{
    vec3 pos;
    vec2 uv;
    vec3 normal;
};
    
layout (set = 0, binding = 0) uniform Transforms
{
    mat4 model;
    mat4 view;
    mat4 projection;
} MVP;

layout(set = 1, binding = 0) uniform texture2D textures[];
layout(set = 1, binding = 1) uniform sampler samplers[];
layout(set = 2, binding = 0) readonly buffer VertexBuffer
{
    Vertex vertices[];
} vertexBuffer;
```

这段GLSL代码中，使用了三个set，0， 1， 2，所以我们需要创建三个描述符集布局。

在Vulkan中，描述符集是一个存储shader所使用的资源（如buffer，纹理，sampler）的容器。而绑定则表示将这些描述符集与特定的着色器阶段相关联的过程，使得在渲染过程中，着色器能够和资源进行无缝地交互。

#### Getting ready

我们将描述符集和binding的创建，存储，管理都封装在`VulkanCore::Pipeline`这个类中，实现较为高效的Vulkan渲染管线的资源绑定

#### How to do it...

一个描述符集布局通过`vkDescriptorSetLayout`结构体陈述了它的绑定（数量和类型）。而每个绑定又是通过`vkDerscriptorSetLayoutBinding`描述了，我们可以通过下图来更好地理解其中的关系

![](B18491_02_11.webp)

下面这段代码展示了如何指定`set = 1`中的两个binding

```c++
constexpr uint32_t kMaxBindings = 1000;
const VkDescriptorSetLayoutBinding texBinding = 
{
	.binding = 0,
    .descriptorType = VK_DESCRIPTOR_TYPE_SAMPELD_IMAGED,
    .decritptorCount = kMaxBindings,
    .stageFlags = VK_SHADER_STAGE_VERTEX_BIT,
};
const VkDescriptorSetLayoutBinding samplerBinding = 
{
	.binding = 1,
    .descriptorType = VK_DESCRIPTOR_TYPE_SAMPER,
    .decritptorCount = kMaxBindings,
    .stageFlags = VK_SHADER_STAGE_VERTEX_BIT,
};
struct SetDesciptor
{
    uint32_t set;
    std::vector<VkDescriptorSetLayoutBinding> bindings;
}
std::vector<SetDesciptor> sets(1);
sets[0].set = 1;
sets[0].bindings.push_back(texBinding);
sets[0].bindings.push_back(samplerBinding);
```

接下来，我们构建描述符集布局，以创建一个描述符集

```c++
// to be completed
```

---

### Pushing data to shaders using push constants

向shader中推送常量是另一种向shader中传递数据的方式，这种方式非常高效，并且实现简单。但是传递数据的大小非常有限，Vulkan规范指正保证128字节的数据量。

#### Getting ready

我们将常量推送的实现和管理封装在`VulkanCore::Pipeline`类中

#### How to do it...

推送常量的命令会直接记录在command buffer中，并且不会出现同步的问题。常量在shader的声明如下，每个shader中最多只有一个常量

```glsl
layout (push_constant) uniform Transforms
{
	mat4 model;
} PushConstants;
```

数据的推送必须配置在shader阶段，部分数据可以分配给不同的shader阶段，也可以分配给单独的阶段。我们需要注意的是，数据的总量不能超过`VkPhysicalDeviceLimits::maxPushConstantsSize`这个值

```c++
const VkPushConstantRange range = 
{
	.stageFlags = VK_SHADER_STAGE_VERTEX_BIT,
    .offset = 0,
    .size = 64,
};
std::vector<VkPushConstantRange> pushConstants;
pushConstants.push_back(range);
```

这段代码指出，vertex shader将使用记录在command buffer中的推送常量的前（`offset == 0`）64个字节，这个结构体将用于创建管线布局

---

### Creating a pipeline layout

管线布局是一个需要通过应用程序创建并销毁的Vulkan对象。管线的布局是通过定义binding和set的布局的结构体指定的。

在本小节中，我们将学习如何创建管线布局对象

#### Getting ready

在`VulkanCore::Pipeline`这个类中，`VkPipelineLayoutCreateInfo`会根据一个`VukanCore::Pipeline::SetDescritpor`数组自动创建

#### How to do it...

```

```

---





#### Getting ready

#### How to do it...

