---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/AdvancedLighting/PointShadows/index.html
title: Point Shadows
---

### Point Shadows

---

本篇博客中，我们要实现点光源的shadow mapping。原理基本上和平行光类似，我们从光源视角生成shadow map，根据当前片段的位置采样shadow map，判断片段是否在阴影中。和平行光的shadow mapping的主要区别在于shadow map。

因为点光源是向所有方向投射光线的，所以我们可以尝试生成一个cubemap的shadow map，在片段着色器中采样时，我们使用一个方向向量来获取从光源视角最近的深度值。较为复杂的地方在于如何生成一个cubemap的shadow map。

因为cubemap包含六个面，我们需要渲染场景六次，每次对应立方体的一个面。一种实现的方式是，用6个不同的view矩阵，渲染6次场景，每次将一个cubemap的一个面绑定给frame buffer object。代码大概是这样的：

```c++
for (unsigned int i = 0; i < 6; i++)
{
	GLenum face = GL_TEXTURE_CUBE_MAP_POSITIVE_X + i;
	glFramebufferTexture2D(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, face, depthCubemap, 0);
	BindViewMatrix(lightViewMatrices[i]);
	RenderScene();
}
```

但是这种方法的性能开销较大，所以在本篇博客中，我们将采用另一种方法，可以在一个render pass生成cubemap的shadow map。首先，我们需要创建一个cubemap：

```c++
unsigned int depthCubemap;
glGenTextures(1, &depthCubemap);
glBindTexture(GL_TEXTURE_CUBE_MAP, depthCubeMap);
```

然后给cubemap的每一个面绑定一个2D的depth-value texture：

```c++
const unsigned int SHADOW_WIDTH = 1024, SHADOW_HEIGHT = 1024;
for (unsigned int i = 0; i < 6; i++)
{
	glTexImage2D(GL_TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, GL_DEPTH_COMPONENT, SHADOW_WIDTH, SHADOW_HEIGHT, 0, GL_DEPTH_COMPONENT, GL_FLOAT, nullptr);
}
```

老操作了，设置纹理参数：

```c++
glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
glTexParameteri(GL_TEXTURE_CUBE_MAP, GL_TEXTURE_WRAP_R, GL_CLAMP_TO_EDGE);  
```

我们将使用几何着色器，它允许我们在一个render pass中渲染出所有六个面，我们就可以通过`glFramebufferTexture`来直接将cubemap作为depth attachment绑定给framebuffer：

```c++
glBindFramebuffer(GL_FRAMEBUFFER, depthMapFBO);
glFramebufferTexture(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, depthCubemap, 0);
glDrawBuffer(GL_NONE);
glReadBuffer(GL_NONE);
glBindFramebuffer(GL_FRAMEBUFFER, 0);
```

我们这里又调用了`glDrawBuffer`和`glReadBuffer`，因为我们只关心深度值，所以我们要告诉这个framebuffer object不需要color buffer，不然会有framebuffer object不完整的报错。

我们准备好了cubemap和framebuffer object后，点光源的shadow mapping也是两个步骤，如下所示：

```c++
// 1. first render to depth cubemap
glViewport(0, 0, SHADOW_WIDTH, SHADOW_HEIGHT);
glBindFramebuffer(GL_FRAMEBUFFER, depthMapFBO);
glClear(GL_DEPTH_BUFFER_BIT);
ConfigureShaderAndMatrices();
RenderScene();
glBindFramebuffer(GL_FRAMEBUFFER, 0);
// 2. then render scene as normal with shadow mappping (depth cubeMap)
glViewport(0, 0, SCR_WIDTH, SCR_HEIGHT);
glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
ConfigureShaderAndMatrices();
glBindTexture(GL_TEXTURE_CUBE_MAP, depthCubemap);
RenderScene();
```

---

现在，我们需要实现将场景中所有几何体变换到六个面所对应的光源空间，也就是说，我们需要一个light space transformation matrix ***T***，只不过这次六个面的矩阵各不相同。Light space transformation matrix由两部分组成：projection matrix和view matrix。对于projection matrix，我们会用到透视投影矩阵，且六个面所对应的投影矩阵应该是相同的：

```c++
float aspect = (float)SHADOW_WIDTH / (float)SHADOW_HEIGHT;
float near = 1.0f;
float far = 25.0f;
glm::mat4 shadowProj = glm::perspective(glm::radians(90.0f), aspect, near, far);
```

需要注意的是，我们将投影矩阵的fov设置为了90，这是因为，我们要确保field of view要足以填充立方体的一个面，最终六个面能够匹配成同一个立方体。

我们需要为立方体的各个面创建view matrix，还是借助`glm::lookAt`的帮助：

```c++
std::vector<glm::mat4> shadowTransforms;
shadowTransforms.push_back(shadowProj * 
                 glm::lookAt(lightPos, lightPos + glm::vec3( 1.0, 0.0, 0.0), glm::vec3(0.0,-1.0, 0.0));
shadowTransforms.push_back(shadowProj * 
                 glm::lookAt(lightPos, lightPos + glm::vec3(-1.0, 0.0, 0.0), glm::vec3(0.0,-1.0, 0.0));
shadowTransforms.push_back(shadowProj * 
                 glm::lookAt(lightPos, lightPos + glm::vec3( 0.0, 1.0, 0.0), glm::vec3(0.0, 0.0, 1.0));
shadowTransforms.push_back(shadowProj * 
                 glm::lookAt(lightPos, lightPos + glm::vec3( 0.0,-1.0, 0.0), glm::vec3(0.0, 0.0,-1.0));
shadowTransforms.push_back(shadowProj * 
                 glm::lookAt(lightPos, lightPos + glm::vec3( 0.0, 0.0, 1.0), glm::vec3(0.0,-1.0, 0.0));
shadowTransforms.push_back(shadowProj * 
                 glm::lookAt(lightPos, lightPos + glm::vec3( 0.0, 0.0,-1.0), glm::vec3(0.0,-1.0, 0.0));
```

将projection matrix与view matrix相乘，我们就得到了一组对应cubemap的light space transformation matrices。这些matrices会被传递进shader。

---

为了将深度值绘制成一个cubemap的shadow map，我们总共需要三个shader：vertex、geometry、fragment。在这里，geometry shader用来将world space的顶点变换到六个不同的light space。因为，顶点着色器只需要简单地将顶点变换到世界空间即可：

```glsl
#version 330 core
layout (location = 0) in vec3 aPos;

uniform mat model;

void main()
{
	gl_Position = model * vec4(aPos, 1.0);
}
```

Geometry shader需要三个三角形的顶点作为输入，还需要uniform的light space transformation matrices数组。Geometry shader有一个内置的变量`gl_Layer`，它用来决定当前处理的图元应该发射到cubemap的哪一面。如果这个变量没有被修改的话，那么图元就会按照流程进入图形管线的下一阶段。但是，一旦`gl_Layer`得到了更新，我们就可以按照自己的需求决定要渲染的cubemap的面。当然，我们需要确定当前激活的framebuffer中有绑定的cubemap：

```glsl
#version 330 core
layout (triangles) in;
layout (triangle_strip, max_vertices=18) out;

uniform mat4 shadowMatrices[6];

out vec4 FragPos;

void main()
{
    for(int face = 0; face < 6; ++face)
    {
        gl_Layer = face; // built-in variable that specifies to which face we render.
        for(int i = 0; i < 3; ++i) // for each triangle's vertices
        {
            FragPos = gl_in[i].gl_Position;
            gl_Position = shadowMatrices[face] * FragPos;
            EmitVertex();
        }    
        EndPrimitive();
    }
} 
```

这段Geometry shader的代码其实也相对比较直白，输入是三角形，输出是六个三角形（共计18个vertex）。在`main()`中，我们在六个面上分别执行一次循环内的操作，也就是通过将face对应的下标指定给gl_Layer，从而指定当前的面为输出的面，同时我们还要使用light space transformation matrice将世界坐标变换到light space中。最后我们将得到的FragPos传递给fragment shader，用来计算深度值。

在上一篇[博客](https://lovewithyou.tech/blogs/Graphics/LearnOpenGL/AdvancedLighting/ShadowMapping/)中，我们使用了一个空的片段着色器，并且将计算shadow map深度值的工作交给了OpenGL。但是这次，我们将会自行计算线性深度值，也就是每个closest片段的位置和光源位置的线性距离。计算我们自己的深度值也会让后续的阴影计算更直观：

```glsl
#version 330 core
in vec4 FragPos;

uniform vec3 lightPos;
uniform float far_plane;

void main()
{
	// get distance between fragment and light source
	float lightDistance = length(FragPos.xyz - lightPos);
	
	// map to [0, 1] range by dividing by far_plane
	lightDistance = lightDistance / far_plane;
	
	// write this as modified detph;
	gl_FragDepth = lightDistance;
}
```

使用vertex、geometry、fragment这三个shader，就可以将深度信息存储在cubemap的shadow map中了。

---

万事俱备，让我们来绘制实际的omnidirectional shadows。步骤和平行光的shadow mapping类似，只是这次我们要绑定的是cubemap，而且需要将光源投影的远平面传进shader：

```c++
glViewport(0, 0, SCR_WIDTH, SCR_HEIGHT);
glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
shader.use();
// ... send uniforms to shader (including light's far_plane value)
glActivetexture(GL_TEXTURE0);
glBindTexture(GL_TEXTURE_CUBE_MAP, depthCubemap);
// ... bind other textures
RenderScene();
```

我们用来shadow mapping的shader与之前的也很相似，只是这次的fragment shader不再需要片段在light space中的位置了，因为我们可以通过direction vector来采样shadow map。因此，vertex shader也不需要将位置变换到光源空间了：

```glsl
// vertex shader
#version 330 core
layout (location = 0) in vec3 aPos;
layout (location = 1) in vec3 aNormal;
layout (location = 2) in vec2 aTexCoords;

out vec2 TexCoords;

out VS_OUT 
{
	vec3 FragPos;
	vec3 Normal;
	vec2 TexCoords;
} vs_out;

uniform mat4 projection;
uniform mat4 view;
uniform mat4 model;

void main()
{
	vs_out.FragPos = vec3(model * vec4(aPos, 1.0));
	vs_out.Normal = transpose(inverse(mat3(model))) * aNormal;
	vs_out.TexCoords = aTexCoords;
	gl_Position = projection * view * vec4(vs_out.FragPos, 1.0);
}
```

对于片段着色器，我们依旧采用之前的BlinnPhong光照模型：

```glsl
// fragment shader
#version 330 core
out vec4 FragColor;

in VS_OUT
{
    vec3 FragPos;
	vec3 Normal;
	vec2 TexCoords;
} fs_in;

uniform sampler2D diffuseTexture;
uniform samplerCube depthMap;

uniform vec3 lightPos;
uniform vec3 viewPos;

uniform float far_plane;

float ShadowCalculation(vec3 fragPos)
{
	[...]
}

void main()
{
	vec3 color = texture(diffuseTexture, fs_in.TexCoords).rgb;
	vec3 normal = normalize(fs_in.Normal);
	vec3 lightColor = vec3(0.3);
	
	// ambient 
	vec3 ambient = 0.3 * lightColor;
	
	// diffise
	vec3 lightDir = normalize(lightPos - fs_in.FragPos);
	float diff = max(dot(lightDir, normal), 0.0);
	vec3 diffuse = diff * lightColor;
	
	// specular
	vec3 viewDir = normalize(viewPos - fs_in.FragPos);
	vec3 halfDir = normalized(lightDir + viewDir);
	float spec = pow(max(dot(normal, halfDir), 0.0). 64.0);
	vec3 specular = spec * lightColor;
	
	// calculate shadow
	float shadow = ShadowCalculation(fs_in.FragPos);
	
	vec3 lighting = (ambient + (1 - shadow) * (diffuse + specular)) * color;
	FragColor = vec4(lighting, 1.0);
}
```

接下来，我们看看对于点光源的shadow mapping，`ShadowCalculation`应该是怎样的。

第一步，我们要从cubemap中获取深度值。在前面的章节中，我们在shadow map中存储的深度值代表了片段与光源之间的线性距离：

```glsl
float ShadowCalculation(vec3 fragPos)
{
	vec3 fragToLight = fragPos - lightPos;
	float closestDepth = texture(depthMap, fragToLight).r;
}
```

可以发现，我们使用片段的位置与光源的位置相减，将结果作为一个方向向量去采样shadow map。我们得到的closestDepth的范围在[0, 1]之间，我们还需要将其映射回[0, far_plane]：

```
closestDepth *= far_plane;
```

然后，我们获取当前片段与光源之间的深度值：

```glsl
float currentDepth = length(fragToLight);
```

这样一来，我们就可以比较两个深度值的大小，从而判断哪个值距离光源最近，从而判断当前片段是否在阴影之中。我们同样引入depth bias来避免shadow arne：

```glsl
float bias = 0.05;
float shadow = currentDepth - bias > cloestDepth ? 1.0 : 0.0;
```

