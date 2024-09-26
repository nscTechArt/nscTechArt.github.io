---
title: Vulkan Core Concepts
date: 2024-09-26 22:41 +0800
categories: [Graphics, Modern Vulkan Cookbook]
media_subpath: /assets/img/Graphics/LearnVulkan/
math: false
---

### Learning about Vulkan objects

在本小节，我们将会了解什么是Vulkan的对象，以及Vulkan对象之间是如何相互联系的

#### Getting ready

Vulkan中的对象是一些不透明的句柄，并且对象类型都以`Vk`为前缀命名，例如`VkInstance`，`VkDevice`。有些对象需要其他对象的实例来创建或分配。**这种依赖关系为对象的创建建立了一种隐式的逻辑顺序。**比方说，只有`VkInstance`对象创建后，我们才能创建`VkPhysicalDevice`对象。

#### How to do it...

![](B18491_01_01.png)

上图总结了Vulkan中最重要的一些对象，其中：

1. **实线箭头表示显式的依赖关系**：一个对象需要对其用实线箭头指向的对象进行引用。例如，`VkDevice`需要`VkPhysicalDevice`的索引，而`VkBufferView`需要`VkBuffer`和`VkDevice`的索引。
2. **虚线箭头表示隐式的依赖关系：**以`VkQueue`为例，一个`VkQueue`需要`VkDevice`的索引，但是并不显式地需要`VkPhysicalDevice`对象的索引。之所以说它们的关系是隐式的，是因为`VkQueue`只是一个队列族中的队列索引值，而队列族可以直接从`VkPhysicalDevice`枚举获得
3. **对象可以从另一个对象中分配得到**：如`VkCommandBuffer`可以从`VkCommandPool`中分配得到

我们的系列博客会大致按照图表中从上到下的顺序，依次创建所有对象，并构建一个精简的Vulkan应用程序。

---

### Using Volk to load Vulkan functions and extensions

Volk是一个开源库，提供了跨平台载入Vulkan函数的功能。

#### Getting ready

[zeux/volk: Meta loader for Vulkan API (github.com)](https://github.com/zeux/volk)

Volk提供了CMake构建选项，我们只需要clone到项目的thirdparty目录中，并在构建时包含Volk即可。

#### How to do it...

Volk会自动载入Vulkan的函数指针，同时也会自动完成对Vulkan库的连接，所以我们无需再考虑这个步骤。

要使用Volk，我们需要遵循下面三个步骤：

1. 在应用程序初始化时，调用`volkInitialize()`，然后再调用其他任何Vulkan函数。如果该函数返回失败，则表示系统中没有安装Vulkan loader。
2. 创建好`VkInstance`后，调用`volkLoadInstance()`，它会用`vkGetInstanceProcAddr`获取的函数替换全局函数指针
3. 创建好VkDevice后，调用`volkLoadDevice()`，作用同上

---

