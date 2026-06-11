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
    const defaultClass = "cursor-pointer px-5 py-2.5 rounded-xl transition-all";

    const classes = {
        colors:{
            primary:{
                button: "bg-indigo-600",
                text: "text-white",
                hover: "hover:bg-indigo-500",
                shadow: "shadow-indigo-600/20 shadow-lg",
            },
            secondary:{
                button: "bg-white  flex-1 text-center",
                text: "text-black",
                hover: "",
                shadow: "",
            },
            third:{
                button: "bg-grey-300  flex-1 text-center",
                text: "text-black",
                hover: "",
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

