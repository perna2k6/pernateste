import { useState } from "react";
import { ImageIcon, PlayCircle, Lock } from "lucide-react";

export default function ContentPreview() {
  const [activeTab, setActiveTab] = useState<"photos" | "videos">("photos");

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-foreground">Conteúdo</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab("photos")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === "photos" 
                ? "bg-orange-50 text-orange-500" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            data-testid="tab-photos"
          >
            Fotos
          </button>
          <button 
            onClick={() => setActiveTab("videos")}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === "videos" 
                ? "bg-orange-50 text-orange-500" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            data-testid="tab-videos"
          >
            Vídeos
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="aspect-square content-gradient-1 rounded-lg flex items-center justify-center">
          {activeTab === "photos" ? (
            <ImageIcon className="w-8 h-8 text-orange-400" />
          ) : (
            <PlayCircle className="w-8 h-8 text-orange-400" />
          )}
        </div>
        <div className="aspect-square content-gradient-2 rounded-lg flex items-center justify-center">
          {activeTab === "photos" ? (
            <ImageIcon className="w-8 h-8 text-pink-400" />
          ) : (
            <PlayCircle className="w-8 h-8 text-pink-400" />
          )}
        </div>
      </div>
      
      <div className="text-center p-8 border-2 border-dashed border-muted rounded-lg">
        <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h4 className="font-medium text-foreground mb-1">Conteúdo Protegido</h4>
        <p className="text-sm text-muted-foreground">
          Assine para acessar todo o conteúdo exclusivo
        </p>
      </div>
    </div>
  );
}
