import React from "react";

type SizeType = "small" | "middle" | "large";
type ColorType = "primary" | "secondary";

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
    const defaultClass = "px-5 py-2.5 rounded-xl transition-all shadow-lg";

    const classes = {
        colors:{
            primary:{
                button: "bg-indigo-600",
                text: "text-white",
                hover: "hover:bg-indigo-500",
                shadow: "shadow-indigo-600/20",
            },
            secondary:{
                button: "bg-red-500",
                text: "text-white",
                hover: "hover:bg-red-400",
                shadow: "shadow-red-500/20",
            },
        },
        sizes:{
            small:"rounded-[100px] font-sm",
            middle:"rounded-[14px] font-medium",
            large:"rounded-[16px] font-base min-h-[56px]",
        },
    };

    return(
        <div
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
        </div>
    );
};

