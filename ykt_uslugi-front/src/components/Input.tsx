import React from 'react'

type SizeType = "small" | "middle" | "large" | "description" | "title";
type ColorType = "primary" | "secondary";
//type InputType = "text" | "password";

interface InputProps{
    size: SizeType;
    color: ColorType;
    type: string;
    placeholder?: string;
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    children?:React.JSX.Element;
}

export const Input = (props:InputProps) => 
{
  const {size,type,color,placeholder,value,onChange} = props;
  const defaultClass = "border border-[#E1E4EA] flex items-center rounded-xl px-4 py-3 cursor-text outline-none transition-colors";
  const classes = {
    colors:{
      primary:{
        text: "text-[#1A1A1A]",
        frame: "bg-white focus:ring-[#2F6FED] focus:border-[#2F6FED]",
      },
      secondary:{
        text: "text-white",
        frame: "bg-[#2F6FED]",
      },
    },
    sizes:{
      small:"rounded-[100px] font-sm",
      middle:"rounded-[14px] font-medium min-h-[40px] min-w-[120px]",
      large:"rounded-[16px] font-base min-h-[56px] min-w-[200px] w-full",
      description: "rounded-[14px] font-medium min-h-[320px] min-w-[200px]",
      title:"",
    },
  };

  return (
      <input 
        className={classes.colors[color].text + 
        " " + 
        defaultClass +
        " " +
        classes.sizes[size] +
        " " +
        classes.colors[color].frame}

      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      />
  );
};
