---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/GettingStarted/HelloTriangle/index.html
title: Hello Triangle
---

### Hello Triangle

---

在OpenGL中，所有的物体都在3D空间，但是屏幕却是由二维数组的像素组成的，所以OpenGL中很大一部分工作都是在将3D坐标转换为适配屏幕的2D像素。这个过程是由OpenGL中的图形管线控制的。图形管线可以分为两个部分，首先是将3D坐标转换为2D坐标，其次是将2D坐标转换为被着色的像素。

图形管线可以被分为多个阶段，其中每个阶段的输出结果都会作为下个阶段的输入。每个阶段所执行的任务都是高度特定化的，可以轻松地进行并行运算。在显卡中，处理核心会运行程序来完成图形管线上的各个阶段，我们将这些程序成为Shader。

其中一些Shader是可以有开发人员编写的，从而可以对图形管线中的特定部分实现更精细的控制。下图展示了图形管线上抽象出来的各个阶段，其中蓝色的可以由开发人员自行编写Shader。我们将逐一解释每个阶段的作用。

![](files/pipeline.png)

在图形管线中，我们传入一个由三个3D坐标组成的列表，这些坐标应该形成一个三角形，这个数组在这里被称为Vertex Data，这个顶点数据是一系列顶点的集。一个顶点是一个3D坐标的数据集。这个顶点的数据是通过顶点属性来表示的，它可以包含我们想要的任何数据，但为了简单起见，我们假设每个顶点仅由一个3D位置和一些颜色值组成。 

图形管线的第一个阶段是顶点着色器，它将单个顶点作为输入。顶点着色器的主要目的是将3D坐标转换为另一种3D坐标，同时我们也可以在顶点着色器中对顶点属性进行一些基本处理。

顶点着色器的输出结果，可以选择性地传递给几何着色器，它将构成图元地顶点集合作为输入，并且可以通过创建新的顶点来生成新的图元。如上图所示，几何着色器从给定地形状中生成了第二个三角形。

基元装配阶段将顶点（或几何图形）着色器中构成一个或多个基元的所有顶点（或顶点，如果选择了 GL_POINTS）作为输入，并将所有点装配到所给的基元形状中。

然后，基元组装阶段的输出会传递到光栅化阶段，光栅化阶段会将生成的基元映射到最终屏幕上的相应像素上，形成片段着色器使用的片段。在片段着色器运行之前，会进行剪切。剪切会丢弃视图外的所有片段，从而提高性能。

片段着色器的主要用途是计算像素的最终颜色，这通常也是所有高级 OpenGL 特效出现的阶段。通常，片段着色器包含三维场景的数据，可用于计算最终像素的颜色（如照明、阴影、光线颜色等）。

在确定了所有相应的颜色值后，最终对象将再经过一个阶段，我们称之为 alpha 测试和混合阶段。该阶段会检查片段的相应深度（和模板）值（我们稍后会讨论这些值），并使用这些值来检查生成的片段是位于其他对象的前面还是后面，从而相应地将其丢弃。该阶段还会检查 alpha 值（alpha 值定义了对象的不透明度），并相应地混合对象。因此，即使在片段着色器中计算了像素的输出颜色，在渲染多个三角形时，最终的像素颜色仍可能完全不同。

以上就是图形管线的基本概念。接下来我们来绘制OpenGL中的第一个三角形。

---

为了能够绘制一些图形，我们首先需要给OpenGL提供一些vertex data作为输入。不过OpenGL并不会将所有3D坐标都转换为2D屏幕上的像素，它只会处理在三个坐标轴上范围为[-1, 1]的3D坐标，符合这个标准的3D坐标被称为**normalized device coordinates**。顶点着色器处理完顶点坐标后，会将其转换在NDC中，所有超出这个范围的坐标都会被丢弃。

我们为我们想要绘制的三角形提供一个坐标数组，并且将它们定义在NDC中。

```c++
float vertices[] =
{
    -0.5f, -0.5f, 0.0f,
    0.5f, -0.5f, 0.0f,
    0.0f, 0.5f, 0.0f
};
```

定义完vertex data中，我们就可以将其作为输入传进管线的第一个阶段了。为此，我们需要在GPU上创建存储vertex data的内存、配置OpenGL如何解释该内存、并指定如何将vertex data传进GPU。完成了这些工作，顶点着色器就可以按照我们的要求来处理内存中的顶点了。

我们通过VBO(vertex buffer objects)来管理这些内存，它可以在显存中存储大量的顶点。使用VBO的好处是，我们可以一次性向显卡传入大批量数据，并且在显存足够的前提下将其保留在显存中，而不必逐顶点的发送。从CPU向GPU传输数据的速度相对较慢，因此我们要一次尽可能传输尽量多的数据。一旦数据进入显存，顶点着色器几乎可以立即访问顶点，因此速度极快。

VBO是我们这个系列博客中涉及到的第一个OpenGL Object，与其他Object类似，VBO也有一个独一无二的对应的ID，我们可以使用glGenBuffers来创建一个VBO。

```c++
unsigned int VBO;
glGenBuffers(1, &VBO);
```

OpenGL存在很多类型的buffer objects，VBO所使用的缓冲类型是`GL_ARRAY_BUFFER`。在OpenGL中，只要buffer object所对应的类型不同，我们就可以使用glBindBuffer将buffer object与buffer type进行绑定。

```c++
glBindBuffer(GL_ARRAY_BUFFER, VBO);
```

当我们执行完绑定后，任何buffer相关函数的调用都是针对当前绑定的buffer  object的，也就是VBO。接下来，我们可以使用`glBufferData`来把之前我们定义的vertex data拷贝进VBO的内存中了。

```c++
glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);
```

glBufferData是一个专门用来把开发者定义的数据传进当前绑定的buffer的函数。第一个参数 是我们要将参数拷贝进的buffer type，因为我们此时绑定的是VBO，所以这个参数是`GL_ARRAY_BUFFER`。第二个参数是传进buffer 的data size。第三个参数是实际要传进buffer的数据。第四个参数是配置显卡如何管理我们传进的数据，有三种形式：

- **GL_STREAM_DRAW**：数据只设置一次，GPU 最多使用几次
- **GL_STATIC_DRAW**：数据只设置一次，可多次使用
- GL_DYNAMIC_DRAW：数据会经常改动，且使用频繁。

现在，我们已经通过VBO将vertex data传进GPU了。接下来，我们要创建顶点和片段着色器来实际处理这些数据。

---

首先，我们来用glsl写一个相当基础的顶点着色器

```glsl
#version 330 core
layout (location = 0) in vec3 aPos;

void main()
{
    gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0);
}
```

首先我们声明OpenGL的版本和profile mode。

然后我们通过`in`关键词声明顶点着色器所用到的所有顶点属性，此外，还通过`layout (location = 0)`来设置了输入数据的location。

要设置顶点着色器的输出，我们要把位置数据分配给OpenGL预定义的`gl_Position`。

在实际应用中，顶点着色器所得到的vertex data通常是物体空间下的坐标，还需要转换到NDC中。

---

我们暂且将顶点着色器的源代码保存在一个const  C string中。

```c++
const char *vertexShaderSource = "#version 330 core\n"
    "layout (location = 0) in vec3 aPos;\n"
    "void main()\n"
    "{\n"
    "   gl_Position = vec4(aPos.x, aPos.y, aPos.z, 1.0);\n"
    "}\0";
```

为了能让OpenGL使用shader，shader必须在运行时从源代码中被动态编译出来。这需要我们通过`glCreateShader`来创建shader object，这个函数需要我们提供shader object type作为参数，在这里是`GL_VERTEX_SHADER`。

```c++
unsigned int vertexShader;
vertexShader = glCreateShader(GL_VERTEX_SHADER);
```

接下来我们将顶点着色器的source code赋值给shader object，并编译shader。

```c++
glShaderSource(vertexShader, 1, &vertexShaderSource, nullptr);
glCompileShader(vertexShader);
```

`glShaderSource`将需要编译的shader作为第一个参数，第二个参数表示shader source code有多少个string组成，第二个参数则是实际的shader source code。第四个参数我们暂时设置为null。

为了保险起见，我们最好检查shader的编译是否成功，如果没有成功，我们最好可以输出报错的信息。

```c++
int success;
char infoLog[512];
glGetShaderiv(vertexShader, GL_COMPILE_STATUS, &success);
if (!success)
{
    glGetShaderInfoLog(vertexShader, 512, nullptr, infoLog);
    std::cout << "ERROR: Vertex Shader Compilation Failed\n" << infoLog << "\n";
}
```

---

下面是一个相当基础的OpenGL中的片段着色器

```glsl
#version 330 core
out vec4 FragColor;

void main()
{
    FragColor = vec4(1.0f, 0.5f, 0.2f, 1.0f);
}
```

编译片段着色器的过程与顶点着色器类似，只不过片段着色器所对应的shader object type是`GL_FRAGMENT_SHADER`。

```c++
unsigned int fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
glShaderSource(fragmentShader, 1, &fragmentShaderSource, nullptr);
glCompileShader(fragmentShader);
glGetShaderiv(fragmentShader, GL_COMPILE_STATUS, &success);
if (!success)
{
    glGetShaderInfoLog(fragmentShader, 512, nullptr, infoLog);
    std::cout << "ERROR: Fragment Shader Compilation Failed\n" << infoLog << "\n";
}
```

这样一来，我们两个着色器都准备好了，现在还需要将两个shader object与shader program object链接在一起。

---

OpenGL中的shader program object是多个shader组合而成的最终的linked的版本。要使用编译好的shader，我们需要将它们与shader program链接，然后在渲染时激活shader program。

把shader链接到shader program时，会将每个shader的输出链接到下一个shader 的输入，如果二者不相匹配，也会导致link失败。

Shader program的创建、shader的附加、链接的过程如下:

```c++
unsigned int shaderProgram = glCreateProgram();
glAttachShader(shaderProgram, vertexShader);
glAttachShader(shaderProgram, fragmentShader);
glLinkProgram(shaderProgram);
```

同样保险起见，我们应该检测shader program是否链接成功。

```c++
glGetProgramiv(shaderProgram, GL_LINK_STATUS, &success);
if (!success)
{
    glGetProgramInfoLog(shaderProgram, 512, nullptr, infoLog);
    std::cout << "ERROR: Shader Program Link Failed\n" << infoLog << "\n";
}
```

一旦我们将shader objects链接到了shader program，我们就不再需要它们了，所以最好将它们删除。

现在，我们将vertex data传进了GPU，并指示了GPU如何在顶点着色器和片段着色器中处理vertex data。但是OpenGL还是不知道如何在显存中解释vertex data，也不知道vertex data和顶点着色器的attributes如何关联。

---

顶点着色器允许我们以顶点属性(vertex attributes)的形式指定我们想要的任何输入，虽然这带来了极大的灵活性，但是也意味着我们必须手动指定input vertex data的哪个部分对应顶点着色器中的哪个vertex attributes，也就是说，在渲染前，我们就需要指定OpenGL应该如何解释vertex data。

Vertex buffer data的数据格式如图所示

![](files/vertex_attribute_pointer.png)

- position data被存储在4byte的float中
- 每个position需要三个这样的浮点值
- 每个position之间没有空间，也就是说，每个position都是**tightly packed**在数组中的
- vertex buffer data的第一个值，位于buffer 的起点

基于以上的内容，我们就可以使用glVertexAttribPointer来告诉OpenGL如何解释vertex data了。

```c++
glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)nullptr);
glEnableVertexAttribArray(0);
```

`glVertexAttribPointer`需要的参数众多，我们来结合这个函数的原型一一解释：

```c++
void glVertexAttribPointer(GLuint index, 
                           GLint size, 
                           GLenum type, 
                           GLboolean normalized, 
                           GLsizei stride, 
                           const GLvoid * pointer);
```

1. **GLuint index**：我们需要指定顶点属性的位置。位置必须与顶点着色器中的位置匹配，也就是顶点着色器中`layout (location = index)`所定义的位置
2. **GLint size**：指定顶点属性的大小。顶点属性是一个向量，它有 1 到 4 个分量。
3. **GLenum type**：顶点属性的类型，如 `GL_FLOAT`。
4. **GLboolean normalized**：指定是否应标准化数据。
5. **GLsizei stride**：两个连续顶点属性之间的偏移量。实际上是一种描述顶点数据数组的方式。
6. **const GLvoid * pointer**：顶点属性的偏移量。它是一个相对于缓冲区（VBO）的起始位置的偏移量。处理单纯的位置数据的 VBO 的时候这个值通常为 0。

既然我们已经指定了OpenGL应该如何解释vertex data，我们还应该使用`glEnableVertexAttribArray` 启用顶点属性，并将顶点属性的位置作为其参数。默认情况下，顶点属性时禁用的。

现在，我们已经完成了以下准备工作

- 使用VBO初始化了vertex data，传进了GPU
- 设置了顶点着色器和片段着色器
- 告诉了OpenGL如何将vertex data链接到顶点着色器的vertex attribues。

---

但是，在渲染过程中，我们可能需要频繁改变不同的vertex data和attributes，频繁修改VBO并重新向OpenGL解释是很麻烦的。这就是为什么我们要引入Vertex Array Object（VAO）这个改变，我们只需要将VBO相关的配置信息预先保存在VAO中，然后在渲染时直接绑定相关的VAO即可，极大地降低了复杂度。

一个VAO存储了以下信息：

- `glEnableVertexAttribArray`和`glDisableVertexAttribArray`的调用
- 通过`glVertexAttribPointer`配置的vertex attributes
- 通过调用`glVertexAttribPointer`与vertex attributes相关联的VBOs

VAO的创建与VBO类似

```c++
unsigned int VAO;
glGenVertexArrays(1, &VAO);
```

还需要通过`glBindVertexArray`绑定VAO，然后再配置顶点属性以及绑定和设置 VBO：如使用 `glVertexAttribPointer` 相关函数来进行顶点属性配置等操作。

---

为了绘制我们选择的对象，OpenGL 为我们提供了 glDrawArrays 函数，该函数使用当前活动着色器、先前定义的顶点属性配置和 VBO 的顶点数据（通过 VAO 间接绑定）绘制基元。

```
glUseProgram(shaderProgram);
glBindVertexArray(VAO);
glDrawArrays(GL_TRIANGLES, 0, 3);
```

`glDrawArrays` 函数的第一个参数是我们要绘制的 OpenGL 原始类型。因为我一开始就说过我们要绘制三角形，所以我们输入了 `GL_TRIANGLES`。第二个参数指定了我们要绘制的顶点数组的起始索引；我们将其保留为 0。最后一个参数指定了我们要绘制的顶点个数，即 3 个（我们只从数据中渲染一个三角形，其长度正好是 3 个顶点）。

---

在渲染顶点时，我们还想讨论最后一件事，那就是元素缓冲对象，简称 EBO。要解释元素缓冲对象的工作原理，最好举个例子：假设我们想画一个矩形而不是三角形。我们可以使用两个三角形来绘制矩形（OpenGL 主要使用三角形）。

一旦我们的模型变得更加复杂，拥有超过 1000 个三角形时，这种情况就会变得更糟，因为会有大块的三角形重叠。更好的解决方案是只存储唯一的顶点，然后指定绘制这些顶点的顺序。在这种情况下，我们只需为矩形存储 4 个顶点，然后指定绘制顺序即可。如果 OpenGL 能提供这样的功能，岂不美哉？

值得庆幸的是，元素缓冲对象的工作原理正是如此。EBO 是一个缓冲区，就像顶点缓冲区对象一样，它存储了 OpenGL 用来决定绘制哪些顶点的索引。这种所谓的索引绘制正是我们问题的解决方案。首先，我们必须指定（唯一的）顶点和索引，以便将它们绘制成矩形：

```c++
float vertices[] =
{
    0.5f, 0.5f, 0.0f,   // top right
    0.5f, -0.5f, 0.0f,  // bottom right
    -0.5f, -0.5f, 0.0f  // bottom left
    -0.5f, 0.5f, 0.0f,  // top left
};
unsigned int indices[] =
{
    0, 1, 3, // first triangle
    1, 2, 3  // second triangle
};
```

可以看到，使用索引时，我们只需要 4 个顶点，而不是 6 个。 接下来，我们需要创建元素缓冲区对象：

```c++
unsigned int EBO;
glGenBuffers(1, &EBO);
```

与 VBO 类似，我们绑定 EBO 并使用 glBufferData 将索引复制到缓冲区。此外，与 VBO 类似，我们希望将这些调用放在绑定和解除绑定调用之间，不过这次我们指定 GL_ELEMENT_ARRAY_BUFFER 作为缓冲区类型。
