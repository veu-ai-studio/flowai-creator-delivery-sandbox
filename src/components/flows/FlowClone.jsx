import { useState } from 'react';
import { Copy, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function FlowClone({ flow, onCloneSuccess }) {
  const [cloning, setCloning] = useState(false);
  const [cloned, setCloned] = useState(false);

  const handleClone = async (e) => {
    e?.stopPropagation();
    setCloning(true);

    const clonedFlow = await base44.entities.SavedFlow.create({
      name: `${flow.name} (Copy)`,
      nodes: flow.nodes || [],
      edges: flow.edges || [],
      variables: flow.variables || [],
    });

    setCloning(false);
    setCloned(true);
    setTimeout(() => setCloned(false), 2000);
    onCloneSuccess?.(clonedFlow);
  };

  return (
    <Button size="sm" variant="ghost" className="h-8 w-8" 
      onClick={handleClone} disabled={cloning} title="Clone flow">
      {cloning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : cloned ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}