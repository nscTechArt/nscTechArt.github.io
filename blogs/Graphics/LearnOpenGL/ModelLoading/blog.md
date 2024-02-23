---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/ModelLoading/index.html
title: Model Loading
---

### Model Loading

---

在OpenGL中，我们可以使用Assimp这个库来导入并加载模型，然后我们从 Assimp 的数据结构中检索我们需要的所有数据。因为 Assimp 的数据结构保持不变，无论我们导入的文件格式类型如何，它都会将我们从所有不同的文件格式中抽象出来。

Assimp会将整个模型导入scene obect中，它包含了导入模型/场景的所有数据。然后，Assimp 有一个节点集合，其中每个节点都包含存储在场景对象中的数据索引，其中每个节点可以有任意数量的子节点。Assimp结构的（简单）模型如下所示：

![](files/assimp_structure.png)

- 场景/模型的所有数据(网格、材质等)都会被存放在**Scene Node**中
- 场景的**Root Node**可能包含子节点（像所有其他节点一样），并且可以有一组指向场景对象的**mMeshes**数组中的网格数据的索引。场景的**mMeshes**数组包含实际的Mesh对象，节点**mMeshes**数组中的值只是场景网格数组的索引。
- **Mesh Object**本身则包含了渲染相关的所有数据，比如顶点位置、法向量、纹理坐标、面、材质
- **Mesh Object**会包含**Face Object**，具体则代表了渲染图元（三角形、四边形、点），**Face Object**包含了组成图元的顶点索引
- **Mesh Object**还会包含**Material Object**，它包含了获取材质属性的一些函数

我们需要做的是：首先将物体加载进**Scene Object**，递归地从各个**Children Node**中获取对应的**Mesh Object**，然后再从**Mesh Object**中得到vertex data、indices和材质属性。最终结果是，我们在单个**Model Object**中包含了对应的mesh data，

> 通常，每个模型Model都有它所包含的几个子模型，我们将这些子模型中的每一个都称为网格Mesh。想想一个类似人类的角色：艺术家通常将头部、四肢、衣服和武器建模为单独的组件，所有这些网格的组合结果代表最终模型。Mesh是在 OpenGL 中绘制对象所需的最小表示（顶点数据、索引和材质属性）。Model（通常）由多个Mesh组成。

---

通过Assimp加载的模型，会被存储在Assimp自己的数据结构中。我们需要再把这个数据处理一下，变成OpenGL便于理解的格式。

基于之前的博客，我们已经知道绘制一个物体的基本单元是Mesh，那就让我们动手来实现一个`Mesh`类吧。Mesh类包含一些基本元素：Vertex、Texture，他们的结构体应该是这样的

```c++
struct Vertex
{
	glm::vec3 Position;
	glm::vec3 Normal;
	glm::vec2 TexCoords;
}
```

```c++
struct Texture 
{
    unsigned int id;
    string type; // diffuse or specular
};  
```

基于`Vertex`和`Texture`，我们可以初步实现一下`Mesh`类

```c++
class Mesh
{
public:
	// mesh data
    vector<Vextex> vertices;
    vector<unsigned int> indices;
    vector<Texture> texture;
    
    Mesh(vector<Vertex> vertices, vector<unsigned int> indices, vector<Texture> texture)
    {
        this->vertices = vertices;
        this->indices = indices;
        this->textures = texture;
        
        setupMesh();
    }
    
    void Draw(Shader &shader);
    
private:
    // render data
    unsigned int VAO, VBO, EBO;
    
    void setupMesh();
   
}
```

`Mesh`类的重点在于`setupMesh`的实现，实现过程与我们之前所写的类似，但是我们要借助在`Mesh`类中定义的`struct`

```c++
void setupMesh()
{
    glGenVertexArrays(1, &VAO);
    glGenBuffers(1, &VBO);
    glGenBuffers(1, &EBO);
  
    glBindVertexArray(VAO);
    
    glBindBuffer(GL_ARRAY_BUFFER, VBO);
    glBufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(Vertex), &vertices[0], GL_STATIC_DRAW);  

    glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
    glBufferData(GL_ELEMENT_ARRAY_BUFFER, indices.size() * sizeof(unsigned int), 
                 &indices[0], GL_STATIC_DRAW);

    // vertex positions
    glEnableVertexAttribArray(0);	
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, sizeof(Vertex), (void*)0);
    // vertex normals
    glEnableVertexAttribArray(1);	
    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(Vertex), (void*)offsetof(Vertex, Normal));
    // vertex texture coords
    glEnableVertexAttribArray(2);	
    glVertexAttribPointer(2, 2, GL_FLOAT, GL_FALSE, sizeof(Vertex), (void*)offsetof(Vertex, TexCoords));

    glBindVertexArray(0);
}  
```

C++中的struct有一个很好的特性：它们的内存布局是顺序的，也就是说，**对于一个struct，在内存中的排列顺序就是我们在代码中声明它们的顺序，这也意味着我们可以通过结构体直接创建一个性能优良的缓冲区**。也是出于这个特性，我们可以直接将一串`Vertex`structs的数组指针传给buffer，作为`glBufferData`的参数。

```c++
glBufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(Vertex), vertices[0], GL_STATIC_DRAW);
```

结构体另一个重要的特性就是`offset(s, m)`的预处理指令，第一个参数`s`是结构体，第二个参数m是结构体中的变量名。**这个宏返回从结构体开始到该变量的Byte偏移量。**这对于定义glVertexAttribPointer函数的`offset`参数非常完美

```c++
glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, sizeof(Vertex), (void)*offsetof(Vertex, Normal));
```

---

我们还需要为`Mesh`类实现渲染的功能，也就是`Draw()`函数。不过在通过glDrawElements渲染之前，我们还是需要绑定正确的纹理，但是我们可能并不知道有多少数量的纹理，也不知道纹理的类型(diffuse还是specular)。为了解决这个问题，我们决定要定一个纹理命名的范式，比如说diffuse就是`texture_diffuseN`，specular就是`texture_specularN`

```glsl
uniform sampler2D texture_diffuse1;
uniform sampler2D texture_diffuse2;
uniform sampler2D texture_diffuse3;
uniform sampler2D texture_specular1;
uniform sampler2D texture_specular2;
```

这样一来，我们就可以初步实现`Draw()`了

```c++
void Draw(Shader &shader)
{
	unsigned int diffuseNr = 1;
	unsigned int specularNr = 1;
	for (unsigned int i = 0; i < textures.size(); i++)
	{
        // before binding, we should activite proper texture uint
		glActiveTexture(GL_TEXTURE0 + i);
        string number;
        string name = textures[i].type;
        if (name == "texture_diffuse")
        	number = std::to_string(diffuseNr++);
        else if (name == "texture.specular")
            number = std::to_string(specular++);
        
        shader.setInt(()"material." + name + number).c_str(), i);
        glBindTexture(GL_TEXTURE_2D, textures[i].id);
	}
    glActiveTexture(GL_TEXTURE0);
    
    // draw mesh
    glBindVertexArray(VAO);
    glDrawElements(GL_TRIANGLES, inidices.size(), GL_UNSIGNED_INT, 0);
    glBindVertexArray(0);
}
```

完整的`Mesh`类源码在[这里](https://learnopengl.com/code_viewer_gh.php?code=includes/learnopengl/mesh.h)

---

Model类的初步结构如下：

```c++
class Model
{
public:
    Model(char *path)
    {
        loadModel(path);
    }
    void Draw(Shader, &shader);
private:
    // model data
    vector<Mesh> meshes;
    string directory;
    
    void loadModel(string path);
    void processNode(aiNode *node, const aiScene *scene);
    Mesh processMesh(aiMesh *mesh, const aiScene *scene);
    vector<Texture> loadMaterialTextures(aiMaterial *mat, aiTextureType type, string typeName);
};
```

`Model`类包含的`Draw()`函数也不复杂，就是遍历Model中的所有Mesh，然后依次绘制

```c++
void Draw(Shader &shader)
{
	for (unsigned int i = 0; i < meshes.size; i++)
    {
        meshes[i].Draw(shader);
    }
}
```

---

为了在C++中导入模型，我们需要使用以下库

```c++
#include <assimp/Importer.hpp>
#include <assimp/scene.h>
#include <assimp/postprocess.h>
```

在`Model`类中，我们在构造器中调用了`loadModel()`，它借助Assimp将模型载入到一个**scene object**中，**scene object**是Assimp的数据类型，包含了我们载入的模型的全部信息

使用Assimp载入模型的代码如下：

```c++
Assimp::Importer importer;
const aiScene *scene = importer.ReadFile(path, aiProcess_Triangulate | aiProcess_FlipUVs);
```

首先，我们从Assimp的命名空间中声明一个`Importer`，并调用它的成员函数`ReadFile()`，它需要一个文件路径作为第一个参数，还需要一些后处理选项作为第二个参数。Assimp允许我们通过特定的选项来告诉Assimp在导入模型的过程中，完成一些额外的操作或计算。以上述代码为例，`aiProcess_Triangulate`用来表示Assimp应该首先将模型的所有图元都计算为三角形，`aiProcess_FlipUVs`则会让Assimp将模型的uv的y轴翻转以下。还有一些别的指令可供使用：

- `aiProcess_GenNormals`：如果模型顶点没有法向量，Assimp会生成法向量
- `aiProcess_SplitLargeMeshes`：将较大的mesh分割为一些小的sub mesh
- `aiProcess_OptimizeMeshes`：尝试将多个网格合并为一个更大的网格，从而减少优化的绘制调用

完成模型的载入以后，我们需要将返回的**scene object**转换成Mesh object数组，这一过程也放在`loadModel()`中：

```c++
void loadModel(string path)
{
    Assimp::Importer import;
    const aiScene *scene = importer.ReadFile(path, aiProcess_Triangulate | aiProcess_FlipUVs);
    
    if (!scene || scene->mFlags & AI_SCENE_FLAGS_INCOMPLETE || !scene->mRootNode)
    {
        cout << "ERROR::ASSIMP::" << import.GetErrorString() << "\n";
        return;
    }
    directory = path.substr(0, path.find_last_of('/'));
    
    processNode(scene->mRootNode, scene);
}
```

我们来分析一下。载入模型之后，我们要检查**scene**和root node是否为null值，也要检查它们的**flags**来判断数据是否完整。检测完成后，我们需要检索给定文件路径的目录路径(directory)。

如果一切都没没问题，我们就可以开始处理**scene**中的所有node了。将**root node**传递给`processNode`。回想Assimp的数据结构，每个node都包含一组mesh indices，其中的每个index都指向scene object中的一个特定的mesh。我们所需要做的便是获取mesh indices，从而获取每个mesh，再处理每个mesh，然后在node的子node中执行相同的操作。所以，processNode()的代码如下：

```c++
void processNode(aiNode *node, const aiScene *scene)
{
    // process all the node's mesh (if any)
    for (unsigned int i = 0; i < node->nNumMeshes; i++)
    {
        aiMesh *mesh = scene->mMeshes[node->mMeshes[i]];
        meshes.push_back(processMesh(mesh, scene));
    }
    
    // then do the same for each of its children
    for (unsigned int i = 0; i < node->nNumChildren; i++)
    {
        processNode(node->mChildren[i], scene);
    }
}
```

让我们简要分析一下，首先，我们查看每个node的mesh indices，通过index访问到scene的mMeshes数组，获取对应的mesh，我们将这个mesh传递给`processMesh`，从而返回一个Mesh Object，我们将存放在meshes vector中。

当所有的mesh处理完之后，我们再便利这个node的所有子物体，递归调用`processNode`

---

将`aiMesh`处理为我们自己定义的`Mesh`Object并不困难，我们只需要访问`aiMesh`的属性并存储在`Mesh`中，基于这个思路，`processMesh`的代码如下

```c++
Mesh processMesh(aiMesh *mesh, const aiScene *scene)
{
    vector<Vector> vertices;
    vector<unsigned int> indices;
    vector<Texture> textures;
    
    for (unsigned int i = 0; i < mesh->mNumVertices; i++)
    {
        Vertex vertex;
        // process vertex positions, normals and texture coordinates
        [...]
        vertices.push_back(vertex);
    }
    // process indices
    [...]
    // process material
    if(mesh->mMaterialIndex >= 0)
    {
        [...]
    }
    return Mesh(vertices, indices, textures);
}
```

---

纹理采样是一个性能消耗较大的运算。因此，我们将通过全局存储所有加载的纹理来对模型代码进行一个小的调整。无论我们想在哪里加载纹理，我们首先检查它是否尚未加载。如果是这样，我们采用该纹理并跳过整个加载程序，从而节省了大量处理能力。为了能够比较纹理，我们还需要存储它们的路径：

```c++
struct Texture {
    unsigned int id;
    string type;
    string path;  // we store the path of the texture to compare with other textures
};
```

然后，我们将所有加载的纹理存储在另一个向量中，该向量声明为Model class顶部的私有变量：

```c++
vector<Texture> textures_loaded; 
```

在 loadMaterialTextures 函数中，我们希望将纹理路径与textures_loaded向量中的所有纹理进行比较，以查看当前纹理路径是否等于其中任何一个。如果是这样，我们跳过纹理加载/生成部分，只需使用定位的纹理结构作为网格的纹理。（更新的）函数如下所示：

```c++
vector<Texture> loadMaterialTextures(aiMaterial *mat, aiTextureType type, string typeName)
{
    vector<Texture> textures;
    for(unsigned int i = 0; i < mat->GetTextureCount(type); i++)
    {
        aiString str;
        mat->GetTexture(type, i, &str);
        bool skip = false;
        for(unsigned int j = 0; j < textures_loaded.size(); j++)
        {
            if(std::strcmp(textures_loaded[j].path.data(), str.C_Str()) == 0)
            {
                textures.push_back(textures_loaded[j]);
                skip = true; 
                break;
            }
        }
        if(!skip)
        {   // if texture hasn't been loaded already, load it
            Texture texture;
            texture.id = TextureFromFile(str.C_Str(), directory);
            texture.type = typeName;
            texture.path = str.C_Str();
            textures.push_back(texture);
            textures_loaded.push_back(texture); // add to loaded textures
        }
    }
    return textures;
}  
```

---
