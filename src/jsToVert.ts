import positionVert from "./shaders/position.vert.wgsl?raw"
// import colorFrag from "./shaders/color.frag.wgsl?raw"
import redFrag from "./shaders/red.frag.wgsl?raw"
// 初始化WebGPU
async function initWebGPU(canvas: HTMLCanvasElement) {
	// 判断当前设备是否支持WebGPU
	if (!navigator.gpu) throw new Error("Not Support WebGPU")
	// 请求Adapter对象，GPU在浏览器中的抽象代理
	const adapter = await navigator.gpu.requestAdapter({
		/* 电源偏好
			high-performance 高性能电源管理
			low-power 节能电源管理模式 
		*/
		powerPreference: "high-performance",
	})
	if (!adapter) throw new Error("No Adapter Found")
	//请求GPU设备
	const device = await adapter.requestDevice()
	//获取WebGPU上下文对象
	const context = canvas.getContext("webgpu") as GPUCanvasContext
	//获取浏览器默认的颜色格式
	const format = navigator.gpu.getPreferredCanvasFormat()
	//设备分辨率
	const devicePixelRatio = window.devicePixelRatio || 1
	//canvas尺寸
	const size = {
		width: canvas.clientWidth * devicePixelRatio,
		height: canvas.clientHeight * devicePixelRatio,
	}
  canvas.width = size.width
	canvas.height =size.height
	//配置WebGPU
	context.configure({
		device,
		format,
		// Alpha合成模式，opaque为不透明
		alphaMode: "opaque",
	})

	return { device, context, format, size }
}

// 创建渲染管线
async function initPipeline(device: GPUDevice, format: GPUTextureFormat) {
	// 顶点点位
	const vertex = new Float32Array([
		// 0
		0, 0.5, 0,
		// 1
		-0.5, -0.5, 0,
		// 2
		0.5, -0.5, 0.0,
	])
	// 建立顶点缓冲区
	const vertexBuffer = device.createBuffer({
		// 顶点长度
		size: vertex.byteLength,
		// 用途，用于顶点着色，可写
		usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
	})
	// 写入数据
	device.queue.writeBuffer(vertexBuffer, 0, vertex)

	const descriptor: GPURenderPipelineDescriptor = {
		// 顶点着色器
		vertex: {
			// 着色程序
			module: device.createShaderModule({
				code: positionVert,
			}),
			// 主函数
			entryPoint: "main",
			//缓冲数据,1个渲染管道可最多传入8个缓冲数据
			buffers: [
				{
					// 顶点长度，以字节为单位
					arrayStride: 3 * 4,
					attributes: [
						{
							// 变量索引
							shaderLocation: 0,
							// 偏移
							offset: 0,
							// 参数格式
							format: "float32x3",
						},
					],
				},
			],
		},
		// 片元着色器
		fragment: {
			// 着色程序
			module: device.createShaderModule({
				code: redFrag,
			}),
			// 主函数
			entryPoint: "main",
			// 渲染目标
			targets: [
				{
					// 颜色格式
					format,
				},
			],
		},
		// 初始配置
		primitive: {
			//拓扑结构，triangle-list为绘制独立三角形
			topology: "triangle-list",
		},
		// 渲染管线的布局
		layout: "auto",
	}
	// 创建异步管线
	const pipeline = await device.createRenderPipelineAsync(descriptor)
	//返回异步管线、顶点缓冲区
	return { pipeline, vertexBuffer }
}
// create & submit device commands
// 编写绘图指令，并传递给本地的GPU设备
function draw(
	device: GPUDevice,
	context: GPUCanvasContext,
	pipelineObj: {
		pipeline: GPURenderPipeline
		vertexBuffer: GPUBuffer
	}
) {
	// 创建指令编码器
	const commandEncoder = device.createCommandEncoder()
	// GPU纹理视图
	const view = context.getCurrentTexture().createView()
	// 渲染通道配置数据
	const renderPassDescriptor: GPURenderPassDescriptor = {
		// 颜色附件
		colorAttachments: [
			{
				view: view,
				// 绘图前是否清空view，建议清空clear
				loadOp: "clear", // clear/load
				// 清理画布的颜色
				clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
				//绘制完成后，是否保留颜色信息
				storeOp: "store", // store/discard
			},
		],
	}
	// 建立渲染通道，类似图层
	const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
	// 传入渲染管线
	passEncoder.setPipeline(pipelineObj.pipeline)
	// 写入顶点缓冲区
	passEncoder.setVertexBuffer(0, pipelineObj.vertexBuffer)
	// 绘图，3 个顶点
	passEncoder.draw(3)
	// 结束编码
	passEncoder.end()
	// 结束指令编写,并返回GPU指令缓冲区
	const gpuCommandBuffer = commandEncoder.finish()
	// 向GPU提交绘图指令，所有指令将在提交后执行
	device.queue.submit([gpuCommandBuffer])
}

async function run() {
	const canvas = document.querySelector("canvas")
	if (!canvas) throw new Error("No Canvas")
	// 初始化WebGPU
	const { device, context, format } = await initWebGPU(canvas)
	// 初始化渲染管道
  const pipelineObj = await initPipeline(device, format)
	//绘图
	draw(device, context, pipelineObj)

	// 自适应窗口
	window.addEventListener("resize", () => {
    canvas.width=canvas.clientWidth * devicePixelRatio
    canvas.height=canvas.clientHeight * devicePixelRatio
		context.configure({
			device,
			format,
			alphaMode: "opaque",
		})
		draw(device, context, pipelineObj)
	})
}
run()
