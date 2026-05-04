import { FadeIn, Button } from "../components/ui/app-kit";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 min-h-[70vh] items-center justify-center px-6">
      <FadeIn>
        <div className="text-center">
          <p className="inline-flex items-center justify-center rounded-full border border-line bg-surface-elevated px-4 py-1.5 text-xs font-bold tracking-widest text-primary uppercase mb-6 shadow-sm">خطأ 404</p>
          <h1 className="font-serif text-[4rem] md:text-[5rem] font-bold text-ink leading-none">عذراً.</h1>
          <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-ink-muted">
            يبدو أن الصفحة التي تحاول الوصول إليها غير موجودة أو تم نقلها.
          </p>
          <Button className="mt-10" size="lg" onClick={() => navigate("/")}>
            <ArrowRight className="h-5 w-5 me-3" /> العودة للرئيسية 
          </Button>
        </div>
      </FadeIn>
    </div>
  );
}
