import { Star, Users, Heart } from "lucide-react";

export default function ProfileSection() {
  return (
    <div className="relative mb-16">
      {/* Banner with gradient overlay */}
      <div className="relative w-full h-48 rounded-xl overflow-hidden">
        <div className="w-full h-full banner-gradient"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        
        <div className="absolute top-6 left-6 right-6">
          <h2 className="text-2xl font-bold text-white drop-shadow-lg mb-2">
            Conteúdo Exclusivo
          </h2>
          <div className="flex items-center gap-4 text-sm text-white/90">
            <div className="flex items-center gap-1" data-testid="rating-display">
              <Star className="w-4 h-4 fill-current" />
              <span>4.9</span>
            </div>
            <div className="flex items-center gap-1" data-testid="followers-display">
              <Users className="w-4 h-4" />
              <span>12.5k seguidores</span>
            </div>
            <div className="flex items-center gap-1" data-testid="likes-display">
              <Heart className="w-4 h-4 fill-current" />
              <span>229K</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Image */}
      <div className="absolute -bottom-10 left-6 w-20 h-20 rounded-full border-4 border-card overflow-hidden shadow-lg bg-muted">
        <div className="w-full h-full profile-gradient flex items-center justify-center">
          <span className="text-2xl font-bold text-white">MM</span>
        </div>
      </div>
    </div>
  );
}
