---
title: Getting Started
date: 2024-07-17 05:46 +0800
categories: [Graphics, Learn OpenGL]
media_subpath: /assets/img/Graphics/LearnOpenGL/
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

接下来，我们需要将shader的源码与shader对象完成绑定，并通过函数`glCompileShader`执行编译：

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

#### Fragment shader

fragment shader用于计算像素的颜色值。简单起见，我们先让fragment输出一个单一颜色值：

```glsl
#version 330 core
out vec4 FragColor;

void main()
{
    FragColor = vec4(1.0f, 0.5f, 0.2f, 1.0f);
}
```

在fragment shader中，我们用关键词out来声明输出变量。

fragment shader的编译过程与vertex shader累死，只是我们需要将shader类型改为`GL_FRAGMENT_SHADER`：

```c++
unsigned int fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
glShaderSource(fragmentShader, 1, &fragmentShaderSource, nullptr);
glCompileShader(fragmentShader);
glGetShaderiv(fragmentShader, GL_COMPILE_STATUS, &success);
if (!success)
{
    glGetShaderInfoLog(fragmentShader, 512, nullptr, infoLog);
    std::cout << "Failed to compile fragment shader: " << infoLog << '\n';
}
```

当vertex shader和fragment shader都编译完成后，我们需要做的是将两个shader对象与shader program对象连接在一些。

#### Shader program

shader program对象是多个编译完成的shader连接在一次的结果。让我们执行render call时，将会使用当前激活的shader program。下面是创建并连接shader program的过程：

创建shader program对象很简单：

```c++
unsigned int shaderProgram = glCreateProgram();
```

然后是将program对象与shader对象组合，并连接。我们最好再次检查是否连接成功：

```c++
glAttachShader(shaderProgram, vertexShader);
glAttachShader(shaderProgram, fragmentShader);
glLinkProgram(shaderProgram);
glGetProgramiv(shaderProgram, GL_LINK_STATUS, &success);
if (!success)
{
    glGetProgramInfoLog(shaderProgram, 512, nullptr, infoLog);
    std::cout << "Failed to link shader program: " << infoLog << '\n';
    return -1;
}
```

我们通过函数glUseProgram激活指定的program对象：

```c++
glUseProgram(shaderProgram);
```

当我们把shader与program对象连接成功后，我们就不再需要shader对象了，所以我们最好将其删除：

```c++
glDeleteShader(vertexShader);
glDeleteShader(fragmentShader);
```

我们来回顾一下当前的进度吧：

- 输入的vertex data传递给了GPU
- 通过vertex shader和fragment shader告诉了GPU如何处理vertex data

但是，此时OpenGL还不知道解释内存中的vertex data，以及如何将vertex data与vertex shader的属性连接在一起。

#### Linking Vertex Attributes

顶点着色器允许我们以顶点属性的形式指定任意的输入数据。这些顶点属性可以包括顶点位置、颜色、法线、纹理坐标等。这种灵活性使得我们可以根据需要定义和使用各种不同的顶点属性。但是也意味着我们需要手动指定输入数据如何映射到顶点属性。

OpenGL中的顶点缓存数据遵循下图中的格式：

![](vertex_attribute_pointer.png)

- 位置信息被存储在四字节的浮点值中
- 每个位置有三个浮点值构成
- 每个位置信息之间没有内存上的间隔，也就是说，这些值在数组中是tightly packed的状态
- 数据中第一个值是缓存的起点

有了以上这些信息，我们就可以告诉OpenGL要如何解释vertex data了：

```c++
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), nullptr);
glEnableVertexAttribArray(0);
```

我们需要重点了解一下`glVertexAttribPointer`。该函数用于定义顶点属性数组中的属性，并指定这些属性在缓存区中的内存布局。简单来说，它告诉OpenGL如何解释和访问顶点数据。

`glVertexAttribPointer`的函数签名为：

```c++
void glVertexAttribPointer(GLuint index, GLint size, GLenum type, GLboolean normalized, GLsizei stride, const void* pointer);
```

**`index`**：

- 指定顶点属性的位置（索引）。这个索引与顶点着色器中的属性位置对应，例如`layout(location = 0) in vec3 aPos;`。

**`size`**：

- 指定顶点属性的组件数量。常见的值有1（如`float`）、2（如`vec2`）、3（如`vec3`）和4（如`vec4`）。对于位置属性，通常是3（x, y, z）。

**`type`**：

- 指定每个组件的数据类型。常见的类型有`GL_FLOAT`、`GL_INT`等。对于位置属性，通常是`GL_FLOAT`。

**`normalized`**：

- 指定当数据被访问时是否应该被规范化。GL_TRUE表示数据被映射到0到1之间（对于无符号值）或-1到1之间（对于有符号值）。GL_FALSE表示数据将直接作为浮点数使用。

**`stride`**：

- 指定连续顶点属性之间的字节偏移量。如果顶点属性是紧密打包的，可以将其设为0。否则，它表示每个顶点的字节数。

**`pointer`**：

- 指定第一个顶点属性的第一个组件在缓冲区数据中的偏移量。通常为`(void*)0`，表示从缓冲区的起始位置开始。

当OpenGL已经明白如何解释vertex data后，我们就可以通过函数`glEnableVertexAttribArray`来启用对应的顶点属性了。默认情况下，顶点属性是没有被启用的。

现在，我们终于做好渲染的所有准备工作了。在OpenGL中，绘制一个物体的流程大概如下：

```c++
// 0. copy our vertices array in a buffer for OpenGL to use
glBindBuffer(GL_ARRAY_BUFFER, VBO);
glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
// 1. then set the vertex attributes pointers
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);  
// 2. use our shader program when we want to render an object
glUseProgram(shaderProgram);
// 3. now draw the object 
someOpenGLFunctionThatDrawsOurTriangle();   
```

但是，如果我们要对每个需要绘制的对象都执行这样的流程，代码就过于繁琐和复杂了，特别是某些对象可能有上百个顶点属性。那么有什么优化的手段呢？

#### Vertex Array Object

VAO顶点数组对象用于存储顶点属性配置，VAO的作用是将一组顶点属性状态绑定在一起，从而简化了顶点属性的设置与切换过程。

VAO存储了顶点属性的配置信息，包括顶点属性指针（通过`glVertexAttribPointer`设置）和顶点属性启用状态（通过`glEnableVertexAttribArray`设置）。

是使用多个不同的顶点属性配置时，可以通过VAO快速切换状态。只需要绑定相应的VAO，就可以恢复之前的顶点属性状态，而不需要重新设置顶点属性指针和启用状态。

创建一个VAO的方法与VBO类似：

```c++
unsigned int VAO;
glGenVertexArrays(1, &VAO);
```

接下来，我们需要通过`glBindVertexArray`绑定VAO，使其成为当前启用的顶点数组对象。在VAO绑定状态下，配置顶点属性（如`glVertexAttribPointer`和`glEnableVertexAttribArray`）。此时，这些配置都会存储在当前VAO中。当以上步骤都完成后，我们最好解绑VAO，从而防止意外修改其配置：

```c++
glBindVertexArray(VAO);
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
glEnableVertexAttribArray(0);  
glBindVertexArray(0);
```

#### Drawing a triangle

现在，我们终于可以通过`glDrawArrays`绘制三角形了。`glDrawArrays`是OpenGL中的一个函数，用于绘制几何图形。它根据当前绑定的顶点数组对象（VAO）和顶点缓冲对象（VBO）中的顶点数据进行绘制。它的函数签名为：

```c++
void glDrawArrays(GLenum mode, GLint first, GLsizei count);
```

**`mode`**：指定绘制的图元类型（primitives），常见的值有：

- `GL_POINTS`：绘制点。
- `GL_LINE_STRIP`：绘制一条连接所有顶点的线段。
- `GL_LINE_LOOP`：绘制一条连接所有顶点并且最后一个顶点与第一个顶点相连的线段。
- `GL_LINES`：绘制独立的线段，每两个顶点构成一条线段。
- `GL_TRIANGLE_STRIP`：绘制一系列相互连接的三角形。
- `GL_TRIANGLE_FAN`：绘制一个三角形扇。
- `GL_TRIANGLES`：绘制独立的三角形，每三个顶点构成一个三角形。

**`first`**：指定启用的数组中起始索引。表示从哪个顶点开始绘制。

**`count`**：指定要绘制的顶点数量。

对于我们要绘制的三角形来说，我们需要传递的参数为：

```c++
glUseProgram(shaderProgram);
glBindVertexArray(VAO);
glDrawArrays(GL_TRIANGLES, 0, 3);
```

#### Element Buffer Objects

如果我们想要绘制一个矩形，我们可以将矩形视为两个三角形，这样的话，vertex data应该是这样的：

```c++
float vertices[] = {
    // first triangle
     0.5f,  0.5f, 0.0f,  // top right
     0.5f, -0.5f, 0.0f,  // bottom right
    -0.5f,  0.5f, 0.0f,  // top left 
    // second triangle
     0.5f, -0.5f, 0.0f,  // bottom right
    -0.5f, -0.5f, 0.0f,  // bottom left
    -0.5f,  0.5f, 0.0f   // top left
}; 
```

如我们所见，其中有顶点会重复。如果我们要绘制的是更复杂的模型，这种重复绘制的顶点会带来很大的性能浪费。所以，我们最好仅提供并绘制必要的顶点。在矩形的例子中，我们只需要四个顶点即可，那么我们现在有了新的问题，如何告诉OpenGL正确的绘制顶点的顺序呢？

这就是EBO的作用，它是OpenGL中的一个buffer对象，用于存储顶点的索引。它可以让我们使用索引来引用顶点，而从避免重复顶点数据，提供渲染效率。如果使用EBO，我们的vertex data只需要存储构成矩形必要的四个顶点：

```c++
float vertices[] = {
     0.5f,  0.5f, 0.0f,  // top right
     0.5f, -0.5f, 0.0f,  // bottom right
    -0.5f, -0.5f, 0.0f,  // bottom left
    -0.5f,  0.5f, 0.0f   // top left 
};
```

同时，我们还需要提供一个数组，用于表示每个顶点在矩形中对应的索引：

```c++
unsigned int indices[] = {  // note that we start from 0!
    0, 1, 3,   // first triangle
    1, 2, 3    // second triangle
};  
```

需要注意的是，虽然矩形只需要四个顶点，但是OpenGL通常来说只绘制三角形，所以即使使用了EBO，我们也是按照绘制三角形来指定顶点的索引。在矩形的案例中，我们需要绘制两个三角形，两个三角形分别由第`0, 1, 3,`个顶点和第`1, 2, 3` 个顶点组成。

EBO与VBO都是buffer对象，所以创建的过程是相似的：

```c++
unsigned int EBO;
glGenBuffers(1, &EBO);
```

EBO对象的类型是`GL_ELEMENT_ARRAY_BUFFER`，这里我们需要和VBO的`GL_ARRAY_BUFFER`做区别：

```c++
glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);
```

由于我们现在使用EBO，也就是从index buffer中绘制三角形，所以我们需要将glDrawArrays替换为glDrawElements：

```c++
glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, nullptr);
```

这里我们还需要额外提一点，就是VAO不仅存储顶点属性配置，还会存储EBO的绑定状态，这意味着在绑定VAO时，关联的EBO也会自动绑定。所以在使用VAO进行绘制时，不需要每次都重新绑定EBO，只需要绑定VAO即可。

![](vertex_array_objects_ebo.png)

---

### Shaders

#### GLSL

shader一般都遵循这样的结构：

```glsl
#version version_number
in type in_variable_name;
in type in_variable_name;

out type out_variable_name;
  
uniform type uniform_name;
  
void main()
{
  // process input(s) and do some weird graphics stuff
  ...
  // output processed stuff to output variable
  out_variable_name = weird_stuff_we_processed;
}
```

我们通常会使用另一种术语来特指vertex shader的输入变量：vertex attribute。设备不同，顶点属性的最大数量也有可能不同，OpenGL保证至少有16个四分量的顶点属性。在某些设备上，我们可以通过GL_MAX_VERTEX_ATTRIBS查询支持的顶点属性数量：

```c++
int nrAttributes;
glGetIntegerv(GL_MAX_VERTEX_ATTRIBS, &nrAttributes);
std::cout << "Maximum nr of vertex attributes supported: " << nrAttributes << '\n';
```

#### Types

GLSL支持大部分默认的基础类型，如`int`、`float`、`double`、`uint`和`bool`。同时，GLSL还支持两个额外的容器类型：`vectors`和`matrices`。其中后者我们后面再详细了解

##### Vectors

GLSL中的vectors类型是可以包含基本类型作为若干分量（最大为4）的复合类型。大多数情况下，我们用到的是表示浮点数的`vecn`。我们可以通过`xyzw`、`rgba`、`stpq`等字母访问对应的分量。

GLSL还支持swizzling的操作，例如：

```glsl
vec2 someVec;
vec4 differentVec = someVec.xyxx;
vec3 anotherVec = differentVec.zyw;
vec4 otherVec = someVec.xxxx + anotherVec.yxzy;
```

#### Ins and outs

顶点着色器和片段着色器之间的变量类型和名称必须匹配，以确保数据正确传递。

#### Uniforms

Uniform是另一种从CPU上的应用向GPU上的shader传递数据的方式，uniform的运作方式与顶点属性不同。首先，uniform的作用范围是全局的，也就是说uniform变量对于每个shader program对象都是独一无二的，可以在任意阶段的任意shader上获取。

在GLSL中声明uniform变量很简单：

```glsl
#version 330 core
out vec4 FragColor;
  
uniform vec4 ourColor; // we set this variable in the OpenGL code.

void main()
{
    FragColor = ourColor;
} 
```

但此时该uniform变量中没有记录值，我们需要在C++代码中向uniform变量传递数据。想要修改uniform变量的值，我们需要找到shader中uniform属性的索引（或者说位置）：

```c++
float timeValue = glfwGetTime();
float greenValue = (sin(timeValue) / 2.0f) + 0.5f;
int vertexColorLocation = glGetYUniformLocation(shaderProgram, "ourColor");
glUseProgram(shaderProgram);
glUniform4f(vertexColorLocation, 0.0f, greenValue, 0.0f, 1.0f);
```

#### More Attributes

此前，我们的vertex data只包含了顶点的位置，现在让我们把顶点的颜色值也添加到vertex data中：

```c++
float vertices[] = {
    // positions         // colors
     0.5f, -0.5f, 0.0f,  1.0f, 0.0f, 0.0f,   // bottom right
    -0.5f, -0.5f, 0.0f,  0.0f, 1.0f, 0.0f,   // bottom left
     0.0f,  0.5f, 0.0f,  0.0f, 0.0f, 1.0f    // top 
};   
```

由于我们修改了vertex data，我们同样需要修改vertex shader，从而让顶点属性与vertex data相匹配：

```glsl
#version 330 core
layout (location = 0) in vec3 aPos;   // the position variable has attribute position 0
layout (location = 1) in vec3 aColor; // the color variable has attribute position 1
  
out vec3 ourColor; // output a color to the fragment shader

void main()
{
    gl_Position = vec4(aPos, 1.0);
    ourColor = aColor; // set ourColor to the input color we got from the vertex data
}     
```

由于我们在vertex shader中添加了输出值，对应地，我们需要让fragment shader接受此数据：

```glsl

#version 330 core
out vec4 FragColor;  
in vec3 ourColor;
  
void main()
{
    FragColor = vec4(ourColor, 1.0);
}
```

现在，我们需要重新配置顶点属性指针了。当前我们的VBO内存的结构如图所示：

![](vertex_attribute_pointer_interleaved.png)

对顶点属性指针的调整如下：

```c++
// position attribute
glVertexAttriPointer(0, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), nullptr);
glEnableVertexAttribArray(0);
// color attribute
glVertexAttriPointer(1, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)(3 * sizeof(float)));
glEnableVertexAttribArray(1);
```

#### Our Own Shader Class

现在，我们的shader源码还是以字符串常量的形式存储并被读取。我们现在来实现一个`shader`类，它包含从本地读取shader、编译、连接、检查这些功能和。

我们将shader类的定义与实现都放在一个头文件中，这里就不再展示代码了。
