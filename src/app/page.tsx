// app/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Image as ImageIcon, X, Film, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Image from "next/image";
import { QRCodeSVG } from 'qrcode.react';

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<"actor" | "movie">("movie");
  const [loading, setLoading] = useState(false);

  // 持久化结果：分别存电影和演员的结果
  const [movieResult, setMovieResult] = useState<any>(null);
  const [actorResult, setActorResult] = useState<any>(null);

  const [remainingUses, setRemainingUses] = useState<number>(5);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 每天重置使用次数
  useEffect(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem("usage");
    let data = stored ? JSON.parse(stored) : { date: "", count: 0 };

    if (data.date !== today) {
      data = { date: today, count: 0 };
      localStorage.setItem("usage", JSON.stringify(data));
    }

    const used = data.count;
    setRemainingUses(Math.max(0, 5 - used));

     if (mode === "movie") {
      const saved = sessionStorage.getItem('lastMovieResult');
      if (saved) setMovieResult(JSON.parse(saved));
    } else if (mode === "actor") {
      const saved = sessionStorage.getItem('lastActorResult');
      if (saved) setActorResult(JSON.parse(saved));
    }
  }, [mode]);

  const updateUsage = () => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem("usage");
    let data = stored ? JSON.parse(stored) : { date: today, count: 0 };
    data.count = (data.count || 0) + 1;
    localStorage.setItem("usage", JSON.stringify(data));
    setRemainingUses(Math.max(0, 5 - data.count));
  };

  // 页面加载时，从 localStorage 恢复结果
  // useEffect(() => {
    // const savedMovie = localStorage.getItem('lastMovieResult');
    // if (savedMovie) setMovieResult(JSON.parse(savedMovie));

    // const savedActor = localStorage.getItem('lastActorResult');
    // if (savedActor) setActorResult(JSON.parse(savedActor));
  // }, []);

  // 保存结果到 sessionStorage（只在当前标签页有效）
  const saveResult = (mode: "movie" | "actor", data: any) => {
    if (mode === "movie") {
      setMovieResult(data);
      sessionStorage.setItem('lastMovieResult', JSON.stringify(data));
    } else {
      setActorResult(data);
      sessionStorage.setItem('lastActorResult', JSON.stringify(data));
    }
  };

  // // 当切换标签时，从 sessionStorage 恢复当前标签的结果（如果有）
  // useEffect(() => {
  //   if (mode === "movie") {
  //     const saved = sessionStorage.getItem('lastMovieResult');
  //     if (saved) setMovieResult(JSON.parse(saved));
  //   } else if (mode === "actor") {
  //     const saved = sessionStorage.getItem('lastActorResult');
  //     if (saved) setActorResult(JSON.parse(saved));
  //   }
  // }, [mode]);  // 依赖 mode，切换时检查

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 上传新图片时自动清空旧结果
    setMovieResult(null);
    setActorResult(null);
    sessionStorage.removeItem('lastMovieResult');
    sessionStorage.removeItem('lastActorResult');

    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请上传图片文件");
      return;
    }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    // 新图片不自动清空旧结果（按需求保持）
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    // 上传新图片时自动清空旧结果
    setMovieResult(null);
    setActorResult(null);
    sessionStorage.removeItem('lastMovieResult');
    sessionStorage.removeItem('lastActorResult');
    
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    } else {
      toast.error("请拖入图片文件");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const clearImage = () => {
    setImage(null);
    setPreview(null);
    setMovieResult(null);
    setActorResult(null);
    sessionStorage.removeItem('lastMovieResult');
    sessionStorage.removeItem('lastActorResult');
  };

  const handleSearch = async () => {
    if (!image) {
      toast.error("请先上传图片");
      return;
    }

    if (remainingUses <= 0) {
      toast.warning("今日免费次数已用完，加入 Telegram 群获取更多次数");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", image);

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("上传失败");
      const { url: imageUrl } = await uploadRes.json();

      const recognizeRes = await fetch("/api/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, mode }),
      });

      if (!recognizeRes.ok) {
        const err = await recognizeRes.json();
        throw new Error(err.error || "识别失败");
      }

      const data = await recognizeRes.json();

      // 保存结果
      saveResult(mode, data);
      updateUsage();
      toast.success("识别成功！");
    } catch (err: any) {
      toast.error(err.message || "识别失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI 识图找电影 & 演员
        </h1>
        <p className="text-center text-muted-foreground mb-6">
          上传截图、海报或照片，AI 瞬间告诉你这是哪部电影或哪位演员
        </p>

        {/* 使用次数 Banner */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-3 bg-white/80 dark:bg-slate-800/80 px-6 py-3 rounded-full shadow-md border border-slate-200 dark:border-slate-700">
            <span className="text-lg font-medium">
              今日剩余免费次数：{remainingUses} / 5
            </span>
            {remainingUses <= 0 && (
              <Button variant="outline" size="sm" asChild>
                <a href="https://t.me/你的机器人用户名" target="_blank" rel="noopener noreferrer">
                  加入 Telegram 获取更多
                </a>
              </Button>
            )}
          </div>
        </div>

        <Card className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-xl">
          <CardContent className="p-6 md:p-10">
            <div
              className={`border-2 border-dashed rounded-xl p-8 md:p-16 text-center transition-all duration-300 ${
                preview
                  ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                  : "border-slate-400 hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/10"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {preview ? (
                <div className="relative mx-auto max-w-md">
                  <Image
                    src={preview}
                    alt="预览"
                    width={500}
                    height={500}
                    className="rounded-lg shadow-2xl object-contain mx-auto max-h-[400px]"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={clearImage}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                  <p className="text-lg font-medium mb-2">拖拽图片到这里 或 点击上传</p>
                  <p className="text-sm text-muted-foreground mb-6">支持 JPG、PNG、WebP 等格式</p>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    选择图片
                  </Button>
                </>
              )}
            </div>

            {preview && (
              <div className="mt-8">
                <Tabs defaultValue="movie" className="w-full" value={mode} onValueChange={(v) => setMode(v as any)}>
                  <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="movie">
                      <Film className="mr-2 h-4 w-4" />
                      找电影
                    </TabsTrigger>
                    <TabsTrigger value="actor">
                      <User className="mr-2 h-4 w-4" />
                      找演员
                    </TabsTrigger>
                    <TabsTrigger value="clear" disabled onClick={clearImage}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      清除
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={handleSearch}
                      disabled={loading || remainingUses <= 0}
                      className="min-w-[140px]"
                      size="lg"
                    >
                      {loading ? "识别中..." : mode === "movie" ? "找电影" : "找演员"}
                    </Button>
                    <Button variant="outline" onClick={clearImage} size="lg">
                      清除
                    </Button>
                  </div>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 结果展示区 */}
        <div className="mt-10">
          {mode === "movie" && (
            <Card className="border-none shadow-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
              <CardContent className="p-8">
                {movieResult ? (
                  <div className="space-y-4 text-lg">
                    <div>
                      <strong>电影名称：</strong> {movieResult?.title || "暂无"}
                    </div>
                    <div>
                      <strong>电影评分：</strong>
                      {movieResult?.rating ? (
                        <span className="text-yellow-500">
                          {'★'.repeat(Math.floor(Number(movieResult.rating) || 0))}
                          {'☆'.repeat(5 - Math.floor(Number(movieResult.rating) || 0))}
                        </span>
                      ) : "暂无"}
                    </div>
                    <div>
                      <strong>电影演员：</strong> 
                      {Array.isArray(movieResult?.actors) ? movieResult.actors.join('、') : "暂无"}
                    </div>
                    <div>
                      <strong>观看链接：</strong> 
                      {Array.isArray(movieResult?.watchLinks) && movieResult.watchLinks.length > 0 
                        ? movieResult.watchLinks.join('、') 
                        : "暂无"}
                    </div>
                    <div>
                      <strong>下载链接：</strong> 
                      {Array.isArray(movieResult?.downloadLinks) && movieResult.downloadLinks.length > 0 
                        ? movieResult.downloadLinks.join('、') 
                        : "暂无"}
                    </div>
                    <div>
                      <strong>下载种子：</strong> {movieResult?.torrent || "暂无"}
                    </div>
                    <div>
                      <strong>电影信息：</strong> {movieResult?.description || "暂无"}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    点击上方“找电影”开始识别
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {mode === "actor" && (
            <Card className="border-none shadow-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
              <CardContent className="p-8">
                {actorResult ? (
                  <div className="space-y-4 text-lg">
                    <div>
                      <strong>演员名称：</strong> {actorResult?.name || "暂无"}
                    </div>
                    <div>
                      <strong>演员信息：</strong>
                      <p className="mt-2 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {actorResult?.info || "暂无"}
                      </p>
                    </div>
                    <div>
                      <strong>主要参演电影：</strong>
                      <ul className="list-disc pl-6 mt-2 space-y-2">
                        {Array.isArray(actorResult?.movies) && actorResult.movies.length > 0 ? (
                          actorResult.movies.map((movie: string, index: number) => (
                            <li key={index}>{movie}</li>
                          ))
                        ) : (
                          <li>暂无</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    点击上方“找演员”开始识别
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 无结果时的占位 */}
          {((mode === "movie" && !movieResult) || (mode === "actor" && !actorResult)) && preview && (
            <div className="text-center text-muted-foreground py-12">
              点击上方按钮开始识别
            </div>
          )}
        </div>

        {/* Telegram 二维码 */}
        <div className="mt-12 text-center">
          <div className="inline-block p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <QRCodeSVG
              value="https://t.me/你的机器人用户名"
              size={160}
              level="H"
              fgColor="#000000"
              bgColor="transparent"
            />
            <p className="mt-4 font-medium">扫码加入 Telegram 影迷群</p>
            <p className="text-sm text-muted-foreground mt-1">
              获取更多免费次数 · 讨论更多电影 · 扩展功能
            </p>
            <Button variant="link" asChild className="mt-2">
              <a href="https://t.me/你的机器人用户名" target="_blank" rel="noopener noreferrer">
                直接点击加入 →
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}