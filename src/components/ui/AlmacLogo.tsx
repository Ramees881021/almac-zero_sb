import almacLogo from '@/assets/almac-logo.svg';

interface AlmacLogoProps {
  className?: string;
}

export const AlmacLogo = ({ className = "h-10" }: AlmacLogoProps) => {
  return (
    <img 
      src={almacLogo} 
      alt="Almac Group" 
      className={className}
    />
  );
};
