---
title: Getting Started
date: 2024-07-17 05:46 +0800
categories: [Graphics, Learn OpenGL]
---

### Hello Window

#### GLFW Initialization

GLFW是一个用于创建窗口、处理输入（键盘、鼠标、手柄等）以及管理OpenGL上下文的库。

现在，我们来创建一个OpenGL窗口。首先我们需要在main函数中实例化一个GLFW窗口：

```c++
#include <glad/glad.h>
#include <GLFW/glfw3.h>

int main()
{
	glfwInit();
	glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
	glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
	glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
}
```

在这段代码中，`glfwInit()`用于初始化GLFW，然后我们再通过`glfwWindowHint()`配置GLFW。

接下来我们需要创建一个窗口对象，该对象存放所有窗口数据，并在GLFW的绝大多数函数都需要该窗口对象作为参数。

```c++
GLFWwindow* window = glfwCreateWindow(800, 600, "Getting Started", nullptr, nullptr);
if (window == nullptr)
{
    std::cout << "Failed to create GLFW window" << '\n';
    glfwTerminate();
    return -1;
}
glfwMakeContextCurrent(window);
```

函数`glfwCreateWindow()`的前两个参数是窗口的宽高，第三个参数是窗口的标题，后两个参数我们暂时忽略。最后，我们使用`glfwMakeContextCurrent(window)`来设置当前的上下文。

#### GLAD

GLAD是一个OpenGL加载器库，用于加载OpenGL函数指针。由于OpenGL函数是由驱动程序提供的，所以在使用它们之前需要获取这些函数的地址。

所以，在调用任何OpenGL的函数之前，我们需要先初始化GLAD：

```c++
if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress))
{
    std::cout << "Failed to initialize GLAD" << '\n';
    return -1;
}
```

`glfwGetProcAddress`是GLFW库提供的一个函数，用于获取OpenGL函数的地址。它返回一个指向OpenGL函数的指针。这个函数是平台相关的，因为每个操作系统有不同的方法来获取这些函数地址。

`GLADloadproc`是一个函数指针类型，定义了函数指针的签名，即它是一个接受`const char*`类型参数并返回`void*`类型结果的函数指针。

`gladLoadGLLoader`是GLAD库提供的一个函数，用于加载所有的OpenGL函数指针。

#### Viewport

在我们开始渲染之前，我们还需要设置OpenGL的视口：

```c++
glViewport(0, 0, 800, 600);
```

函数`glViewport()`用于设置视口。在OpenGL中，视口定义了将NDC转换为窗口坐标的区域。NDC的范围范围是[-1, 1]，而窗口坐标范围是由视口的尺寸决定的。例如，如果视口设置为窗口的整个区域，NDC将被映射到整个窗口。

`glViewport()`的前两个参数表示视口的左下角在窗口中的位置（以像素为单位），后两个参数表示视口的宽度和高度。

在OpenGL中，我们通常需要在窗口大小改变时调用`glviewport`函数，以确保渲染内容正确适应窗口的大小。具体的做法如下。

我们首先注册一个回调函数，每当窗口大小调整时就会被调用，并重新设置视口的大小。

```c++
void framebuffer_size_callback(GLFWwindow* window, int width, int height)
{
    glViewport(0, 0, width, height);
}
```

然后在窗口大小改变时调用回调函数：

```c++
glViewport(0, 0, 800, 600);
glfwSetFramebufferSizeCallback(window, framebuffer_size_callback);
```

#### Render loop

我们不希望我们的程序在渲染一帧图像就直接关闭，我们希望的是让程序不停的绘制，并得到用户的明确指令后才结束程序。所以我们需要创建一个render loop：

```c++
while (!glfwWindowShouldClose(window))
{
    glfwSwapBuffers(window);
    glfwPollEvents();
}
```

`glfwWindowShouldClose`会在每次循环开始时检查是否GLFW已经得到了关闭的指令，如果是，则循环结束，进而关闭程序。

`glfwPollEvents`用于处理和分发事件。它的主要作用是处理输入事件（如键盘、鼠标、窗口等）并调用相应的回调函数。

`glfwSwapBuffers`用于交换color buffer。

#### End application

当render loop结束后，我们需要完成终止GLFW并释放资源。我们可以深入了解一下具体涉及到哪些资源：

1. **释放分配的内存**：GLFW在运行期间会分配内存来管理窗口、输入设备和OpenGL上下文。调用`glfwTerminate`会释放这些内存，防止内存泄漏。
2. **销毁窗口**：`glfwTerminate`会关闭并销毁所有由GLFW创建的窗口。这是确保窗口系统资源（如窗口句柄、上下文等）被正确释放的必要步骤。
3. **清理系统资源**：GLFW可能会使用操作系统的资源（如线程、文件句柄等），这些资源需要在程序结束时正确释放。

此外，GLFW库会维护一些全局状态，这些状态在`glfwTerminate`调用时会被重置。这可以确保在程序多次运行或在同一个进程中多次初始化GLFW时，不会受到之前状态的影响。

#### Input

我们创建一个`processInput`函数，用于管理所有的用户输入。首先第一个输入是退出键：

```c++
void processInput(GLFWwindow* window)
{
	if (glfwGetKey(window, GLFW_KEY_ESCAPE) == GLFW_PRESS)
	{
		glfwSetWindowShouldClose(window, true);
	}
}
```

当GLFW确定用户按下退出键时，就会设置窗口需要关闭的指令。

我们需要在渲染循环中不断调用`processInput`

```c++
while (!glfwWindowShouldClose(window))
{
    processInput(window);

    glfwSwapBuffers(window);
    glfwPollEvents();
}
```
{: add-line="3"}

#### Rendering

所有渲染相关的指令都应该在渲染循环内，所以我们可以梳理一下渲染循环中的结构：

```c++
// render loop
while(!glfwWindowShouldClose(window))
{
    // input
    processInput(window);

    // rendering commands here
    ...

    // check and call events and swap the buffers
    glfwPollEvents();
    glfwSwapBuffers(window);
}
```

我们可以用指定颜色清空屏幕来测试一下渲染指令是否能够成功被执行。在OpenGL中，我们需要在每帧的开始清屏，否则我们还是会看到上一帧的渲染结果。调用glClear可以完成这个任务，并且我们需要明确指定出需要清理的buffer，可能的选项为`GL_COLOR_BUFFER_BIT`、`GL_DEPTH_BUFFER_BIT` 和`GL_STENCIL_BUFFER_BIT`。目前，我们先仅清除颜色缓存，需要注意的是，在清除颜色缓存之前，我们需要先指定出清除用的颜色值：

```c++
glClearColor(0.2f, 0.3f, 0.3f, 1.0f);
glClear(GL_COLOR_BUFFER_BIT);
```

---

### Hello Triangle

#### NDC

当顶点坐标经过vertex shader处理后，坐标会处于NDC空间中，也就是范围在[-1,1]之间。任何位于NDC范围以外的坐标都会被丢弃或裁剪掉，最终无法出现在屏幕上。

NDC坐标下一步会通过视口变换，变换到屏幕空间坐标，然后屏幕坐标会作为fragment shader的输入值并被转换为fragment。

#### Vertex input

我们想要绘制一个三角形，所以我们需要给出三角形三个顶点的坐标（位于NDC范围内）：

```c++
float vertices[] = {
    -0.5f, -0.5f, 0.0f,
     0.5f, -0.5f, 0.0f,
     0.0f,  0.5f, 0.0f
};  
```

当我们定义好vertex data后，我们想要将它作为输入传递给图形管线的第一个阶段：vertex shader。具体的做法如下：

- 创建GPU内存，通常通过创建顶点缓存对象VBO来实现
- 配置OpenGL如何解释内存中的数据，例如每个顶点有多少属性，每个属性的类型是什么，以及这些属性在内存中的布局是怎样的。通常通过顶点数组对象VAO来配置。
- 将顶点数据发送到GPU，通过绑定VBO并调用相应的OpenGL函数（如`glBufferData`）来实现

VBO是OpenGL中的一个缓存对象，用于在GPU中存储顶点数据。VBO为我们提供了一种高效的方法来传输和存储顶点数据，从而提高渲染性能。我们可以通过`glGenBuffers`来创建一个缓存对象：

```c++
unsigned int VBO;
glGenBuffers(1, &VBO);
```

OpenGL中有很多种类的缓存对象，而VBO对应的类型是`GL_ARRAY_BUFFER`。我们可以通过`glBindBuffer`将我们创建的VBO绑定到`GL_ARRAY_BUFFER`：

```c++
glBindBuffer(GL_ARRAY_BUFFER, VBO);
```

一旦我们绑定了一个缓冲对象（VBO）到一个目标（例如`GL_ARRAY_BUFFER`）上时，任何后续针对该目标的缓冲操作都会影响当前绑定的缓冲对象。

然后，我们就可以调用`glBufferData`将之前定义的vertex data拷贝到缓存内存上：

```c++
glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
```

`glBufferData`是OpenGL中的一个函数，用于为当前绑定的缓存对象（如VBO）分配内存空间，并将数据拷贝到该缓存对象的内存中。我们来看一下该函数的签名：

```c++
void glBufferData(GLenum target, GLsizeiptr size, const void* data, Glenum usage);
```

下面是对应的参数解释：

1. `target`：指定缓存对象的目标类型。常见的目标类型包括VBO的`GL_ARRAY_BUFFER`、顶点索引数据的`GL_ELEMENT_ARRAY_BUFFER`
2. `size`：指定要分配的内存大小，以字节为单位。
3. `data`：指向包含数据的指针。如果我们不希望立即初始化缓存区数据，可以传递`nullptr`
4. `usage`：指定预期的数据存储方式，以优化性能。常用的用法模式包括：
   - `GL_STATIC_DRAW`：数据不会频繁更改，适合静态数据。
   - `GL_DYNAMIC_DRAW`：数据会频繁更改，适合动态数据。
   - `GL_STREAM_DRAW`：数据将每帧更改，适合每帧更新的数据。

当`glBufferData`调用完成后，GPU就可以访问和使用这些数据进行渲染了。所以，接下来我们的任务是创建vertex shader与fragment shader来实际处理此数据。

#### Vertex Shader

我们首先要做的是用GLSL（OpenGL Shadings Language）来编写vertex shader，在完成shader的编译后，我们就可以在程序中使用shader了。下面是一个相当基础的vertex shader的代码：

```glsl
#version 330 core
layout (location = 0) in vec3 aPos;

void main()
{
	gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0);
}
```

每个shader都需要先声明语言版本以及配置模式。接下来，我们使用in关键词来声明所有的输入顶点属性。现在我们只有顶点的位置信息，所以只需要一个顶点属性即可。此外，我们还通过`layout (location = 0)`来明确指定输入变量的位置，我们会在后续了解到这么做的原因。

我们将位置信息赋值给预定义的gl_Position变量，然后gl_Position会作为vertex shader的输出。

这个代码向我们展示了最简单的vertex shader是什么样子。在这个vertex shader中，我们只是将输入值直接输出出去，没有任何处理。但在我们后续的程序中，vertex shader需要将坐标变换到NDC空间下。

#### Compiling a shader

为了降低复杂性，我们暂且将vertex shader的源码存储在C-style的常量字符串中：

```c++
const char *vertexShaderSource = "#version 330 core\n"
    "layout (location = 0) in vec3 aPos;\n"
    "void main()\n"
    "{\n"
    "   gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0);\n"
    "}\0";
```

为了能够使用这个shader，我们需要OpenGL在运行时从程序源码中动态编译该shader。所以，我们首先需要做的是创建一个shader对象，同样是通过ID索引：

```c++
unsigned int vertexShader;
vertexShader = glCreateShader(GL_VERTEX_SHADER);
```

接下来，我们需要将shader的源码与shader对象完成绑定，并通过函数glCompileShader执行编译：

```c++
glShaderSource(vertexShader, 1, &vertexShaderSource, nullptr);
glCompileShader(vertexShader);
```

严谨起见，我们应该检查shader编译是否成功：

```c++
int success;
char infoLog[512];
glGetShaderiv(vertexShader, GL_COMPILE_STATUS, &success);
if (!success)
{
    glGetShaderInfoLog(vertexShader, 512, nullptr, infoLog);
    std::cout << "Failed to compile vertex shader: " << infoLog << '\n';
}
```

