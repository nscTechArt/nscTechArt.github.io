### What It Takes to Draw a Triangle

#### Step 1 - Isntance And Physical Device Selection

一个Vulkan应用需要通过`VkInstance`来设置Vulkan API，而我们需要通过描述应用程序与所需的API扩展来创建这样一个`VkInstance`对象。在创建完成后，我们就可以查询支持Vulkan的GPU设备，并从中选取一个或多个以创建`VkPhysicalDevice`对象。

#### Step 2 - Logical Device and Queue Families

我们接下来创建逻辑设备，并制定我们需要使用`VkPhysicalDeviceFeatures`与队列族。在VUlkan中，大部分指令（例如绘制命令与内存操作）都会通过将其提交给`VkQueue`对象而异步执行。队列从队列族中分配，每个队列族支持一组特定的操作。例如，我们可以分别使用单独的队列族用于图形、计算与内存转移。显卡的队列族可用性也可以作为我们筛选物理设置的依据。

#### Step 3 - Window Surface and Swap Chain

在绝大多数情况下，我们需要创建一个用于显示渲染图像的窗口。我们可以通过平台原生的API实现创建，也可以使用例如GLFW等第三方库来实现。

将内容渲染到窗口，我们还需要另外两个组件：`VkSurfaceKHR`与`VkSwapChainKHR`，其中`KHR`后缀表示这些对象是由Vulkan扩展提供的。Vulkan API本身是与平台无关的，这也是为什么我们需要使用标准化的窗口系统接口（Window System Interface）扩展来实现与窗口的交互。

Surface对象是对于跨平台的渲染窗口系统的一层封装，通常需要提供原生窗口句柄的引用才能进行实例化，例如Windows平台上的`HWND`。幸运的是，GLFW为我们实现了对应的内置函数。

Swap Chain对象则是一系列Render Targets的集合，它最基础的目的是确保正在绘制的图像不会被呈现出来，从而保证每次呈现的图像都是完整的。每绘制一帧，我们需要swap chain提供图像用作绘制目标。当我们完成这一帧的绘制后，该图像将会被返回给交换链，并在某个节点上被呈现到屏幕上。交换链所维护的render targets的数量与呈现图像的条件取决于呈现方式，常用的呈现方式有双重缓冲与三重缓冲。

#### Step 4 - Image Views and Framebuffers

我们并不能直接绘制从交换链中获取的图像，而是应该将其封装进`VkImageView`与`VkFramebuffer`对象中。一个`VkImageView`对象表示对于图像中特定部分的引用，而`VkFramebuffer`对象则用于引用作为color、depth、stencil目标的`VkImageView`对象。

#### Step 5 - Render Passes

Vulkan中的Render Pass用于描述渲染所用到的图像的类型、用法。

#### Step 6 - Graphics Pipeline

图形管线通过创建一个VkPipeline对象来完成配置

#### Step 7 - Command Pools and Command Buffers

我们在前面提到过，Vulkan中的很多操作，例如绘制，都需要提交给队列。在这些操作被提交之前，它们首先需要被重排序进一个`VkCommandBuffer`对象中，其中command buffer是从`VkCommandPool`中分配的，每个`VkCommandPool`与一个特定的队列族相关联。

想要绘制一个三角形，我们需要向一个command buffer中记录以下指令：

1. 开始Render Pass
2. 绑定图形管线
3. 绘制三个顶点
4. 结束Render Pass

由于framebuffer中的图像取决于交换链给到我们哪个图像，我们需要为每个可能的图像都执行command buffer的记录，并在绘制时选择正确的图像。

#### Step 8 - Main Loop

到了这一步骤，相关的绘制指令都已经被封装到了command buffer中，那么主循环就相对来说简单很多了。我们首先通过`VkAcquireNextImageKHR`从交换链中获取图像，然后为该图像选择恰当的command buffer，并通过`VkQueueSubmit`来执行操作。最后，我们将该图像返回给交换链，并通过`vkQueuePresentKHR`呈现到屏幕上。

提交给队列的操作是异步执行的，所以我们需要使用的类似semaphores这样的同步对象以确保执行顺序的正确。比方说，我们需要等待获取交换链图像的操作完成后，再执行绘制。以及，我们需要等待渲染结束，然后再执行呈现。

#### Summary

简单来说，绘制一个三角形的大致流程如下：

- 创建一个`VkInstance`
- 选择一个合适的显卡，也就是`VkPhysicalDevice`
- 创建一个`VkDevice`，以及用于绘制和呈现的`VkQueue`
- 创建window、window surface以及交换链
- 将交换链图像封装进`VkImageView`
- 创建Render Pass，执行Render Targets与使用细节
- 创建Render Pass所需要的framebuffer
- 配置图形管线
- 为每个交换链图像，分配和记录绘制指令
- 获取交换链图像，提交对应的command buffer，将图像返回给交换链图像

#### Validation Layers

