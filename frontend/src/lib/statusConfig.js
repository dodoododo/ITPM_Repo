export const statusConfig = {
  todo:        { label: "Chưa bắt đầu",   color: "bg-slate-100 text-slate-600",   dot: "bg-slate-400"  },
  in_progress: { label: "Đang thực hiện", color: "bg-blue-50 text-blue-600",      dot: "bg-blue-500"   },
  review:      { label: "Chờ duyệt",      color: "bg-amber-50 text-amber-600",    dot: "bg-amber-500"  },
  done:        { label: "Hoàn thành",     color: "bg-emerald-50 text-emerald-600",dot: "bg-emerald-500"},
};

export const priorityConfig = {
  low:    { label: "Thấp",       color: "text-slate-500",  bg: "bg-slate-100" },
  medium: { label: "Trung bình", color: "text-blue-600",   bg: "bg-blue-50"   },
  high:   { label: "Cao",        color: "text-red-600",    bg: "bg-red-50"    },
};

export const projectStatusConfig = {
  planning:  { label: "Lên kế hoạch",    color: "bg-blue-50 text-blue-600"    },
  active:    { label: "Đang hoạt động",  color: "bg-emerald-50 text-emerald-600" },
  completed: { label: "Hoàn thành",      color: "bg-slate-100 text-slate-600" },
  on_hold:   { label: "Tạm dừng",        color: "bg-amber-50 text-amber-600"  },
};