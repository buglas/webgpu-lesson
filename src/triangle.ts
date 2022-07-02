import triangle from "./shaders/triangle.vert.wgsl?raw"
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
async function initPipeline(
	device: GPUDevice,
	format: GPUTextureFormat
): Promise<GPURenderPipeline> {
	const descriptor: GPURenderPipelineDescriptor = {
		// 顶点着色器
		vertex: {
			// 着色程序
			module: device.createShaderModule({
				code: triangle,
			}),
			// 主函数
			entryPoint: "main",
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
					format: format,
				},
			],
		},
		// 初始配置
		primitive: {
			//绘制独立三角形
			topology: "triangle-list",
		},
    // 渲染管线的布局
		layout: "auto",
	}
	// 返回异步管线
	return await device.createRenderPipelineAsync(descriptor)
}
// 编写绘图指令，并传递给本地的GPU设备
function draw(
	device: GPUDevice,
	context: GPUCanvasContext,
	pipeline: GPURenderPipeline
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
	passEncoder.setPipeline(pipeline)
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
	// 渲染管道
	const pipeline = await initPipeline(device, format)
	// 绘图
	draw(device, context, pipeline)

	// 自适应窗口尺寸
	window.addEventListener("resize", () => {
    canvas.width=canvas.clientWidth * devicePixelRatio
    canvas.height=canvas.clientHeight * devicePixelRatio
		context.configure({
			device,
			format,
			alphaMode: "opaque",
		})
		draw(device, context, pipeline)
	})
}
run()
