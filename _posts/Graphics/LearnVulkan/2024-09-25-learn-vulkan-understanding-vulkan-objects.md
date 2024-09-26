---
title: Understanding Vulkan Objects
date: 2024-09-25 21:58 +0800
categories: [Graphics, Learn Vulkan]
media_subpath: /assets/img/Graphics/LearnVulkan/
math: false
---

> 本篇博客是对[这篇文章](https://gpuopen.com/learn/understanding-vulkan-objects/)的翻译与理解

学习Vulkan的过程中，一个很重要的部分是**理解Vulkan中定义的对象，以及对象之间的相互关系**。原作者Adam Sawicki创建了下面这份图表，向我们展示了Vulkan对象的一些细节。为了简化，图表中的对象省略了`Vk`前缀，

![](Vulkan-Diagram.avif)

在Vulkan中，每个对象都是一个表示以`Vk`为前缀的特定类型的值。这些类型的不应该被视为指针或者序号，同时，我们也不应该试图解释对象所包含的值的含义，我们只需要将其视作一种不向我们展示细节的句柄，然后在函数之间相互传递，并且在必要时销毁即可。

我们来逐步分析一下图表中的元素：

- 图表中存在一些绿色方框的对象，这些对象没有自己对应的类型，它们实际是通过父对象中的`uint32_t`类型的索引值来表示的，例如`VkQueryPool`中的`VkQueries`
- 带有箭头的实线表示对象创建的顺序。例如，在创建`VkDescriptorSet`时，我们必须指定一个创建好的`VkDescriptorPool`。
- 带有方块的实线表示“组成”，也就是说，我们不需要创建该对象，它已经存在于父对象中，我们可以直接获取。例如，我们可以从一个`VkInstance`对象中枚举`VkPhysicalDevice`对象。
- 虚线表示其他类型的关系，比如说将各种命令提交到命令缓冲区中。
- 图表被分为了三个部分，每个部分都有自己的“主要”对象，以红色方框表示。而同一个部分中的其他对象都可以或直接或间接地通过“主要”对象中创建。例如，我们调用函数`vkCreateSampler`来创建一个`VkSampler`对象时，需要用`VkDevice`对象作为第一个参数。

---

接下来，我们简述一下图中所有对象：

- **VkInstance**：
  - 我们要创建的第一个对象。它表示我们的应用程序与Vulkan运行时之间的链接，所以在应用程序中有且只有一个`VkInstance`。
  - 存储了使用Vulkan所需要的与应用程序相关（或者说特定于应用程序层面）的特定状态。因此，在创建VkInstance时，我们必须指定要启用的层（如Validation Layer）和扩展。
- **VkPhysicalDevice**：
  - 表示一个能够支持Vulkan的设备，通常是独立显卡。
  - 可以从`VkInstance`中枚举出所有的可用的`VkPhysicalDevice`，然后我们可以进一步获取物理设备的`vendorID`，`deviceID`，物理设备所支持的特性，以及一些其他属性或限制。
  - `VkPhysicalDevice`可以枚举出可用的所队列族类型。其中最主要的是图形队列，但是也可能有只支持计算或传输的队列。
  - `VkPhysicalDevice`还能够枚举内存堆以及堆中的内存类型。
    - 内存堆用于管理物理设备内存，它定义了设备可用的内存类型和内存的特性。
-  **VkDevice**:
  