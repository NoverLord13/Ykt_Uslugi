import React from "react";

type SizeType = "small" | "middle" | "large";
type ColorType = "primary" | "secondary" | "third";

interface ButtonProps{
    size: SizeType;
    color: ColorType;
    title: string;
    onClick:()=>void;
    children?:React.JSX.Element;
}

export const Button = (props:ButtonProps)=>
{
    const {size,color,title,onClick} = props;
    const defaultClass = "cursor-pointer px-5 py-2.5 rounded-xl transition-all font-semibold inline-flex items-center justify-center";

    const classes = {
        colors:{
            primary:{
                button: "bg-[#2F6FED]",
                text: "text-white",
                hover: "hover:bg-[#245DCC]",
                shadow: "shadow-[#2F6FED]/20 shadow-lg",
            },
            secondary:{
                button: "bg-white border border-[#E1E4EA] flex-1 text-center",
                text: "text-[#1A1A1A]",
                hover: "hover:bg-[#F2F3F5]",
                shadow: "",
            },
            third:{
                button: "bg-[#F2F3F5] flex-1 text-center",
                text: "text-[#1A1A1A]",
                hover: "hover:bg-white",
                shadow: "",
            },
        },
        sizes:{
            small:"rounded-[100px] font-sm",
            middle:"rounded-[14px] font-medium",
            large:"rounded-[16px] font-base min-h-[56px]",
        },
    };

    return(
        <button
        type="button"
        className={
            defaultClass + 
            " " + 
            classes.sizes[size] +
            " " + 
            classes.colors[color].button +
            " " +
            classes.colors[color].hover +
            " " +
            classes.colors[color].shadow
        }
        onClick={onClick}
        >
            <span
            className={classes.colors[color].text}>{title}
            </span>
        </button>
    );
};
