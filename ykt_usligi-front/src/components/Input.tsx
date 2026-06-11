import React from 'react'

type SizeType = "small" | "middle" | "large";
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
  const defaultClass = "border border-slate-200 flex items-center rounded-xl h-[30px] w-[max-content] px-4 py-3 cursor-text";
  const classes = {
    colors:{
      primary:{
        text: "text-black",
        frame: "bg-white",
      },
      secondary:{
        text: "text-white",
        frame: "bg-indigo-600",
      },
    },
    sizes:{
      small:"rounded-[100px] font-sm",
      middle:"rounded-[14px] font-medium min-h-[40px] min-w-[120]",
      large:"rounded-[16px] font-base min-h-[56px] min-w-[200] w-full",
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
      border-none />
  );
};
