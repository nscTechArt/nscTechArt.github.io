### What It Takes to Draw a Triangle

#### Step 1 - Isntance And Physical Device Selection

一个Vulkan应用需要通过`VkInstance`来设置Vulkan API，而我们需要通过描述应用程序与所需的API扩展来创建这样一个`VkInstance`对象。在创建完成后，我们就可以查询支持Vulkan的GPU设备，并从中选取一个或多个以创建`VkPhysicalDevice`对象。

#### Step 2 - Logical Device and Queue Families

我们接下来创建逻辑设备，并制定我们需要使用`VkPhysicalDeviceFeatures`与队列族。在VUlkan中，大部分指令（例如绘制命令与内存操作）都会通过将其提交给`VkQueue`对象而异步执行。队列从队列族中分配，每个队列族支持一组特定的操作。例如，我们可以分别使用单独的队列族用于图形、计算与内存转移。