from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
import torch
from datasets import Dataset
from transformers import (
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
    DataCollatorForSeq2Seq,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
)


PREFIX = {
    "id-to-banjar": "translate Indonesian to Banjar: ",
    "banjar-to-id": "translate Banjar to Indonesian: ",
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--data", required=True, help="Path to dataset CSV")
    p.add_argument("--base_model", default="google/mt5-small", help="Base model name or local path")
    p.add_argument("--out", default="models/translator_mt5", help="Output model folder")
    p.add_argument("--epochs", type=float, default=3.0)
    p.add_argument("--lr", type=float, default=5e-5)
    p.add_argument("--train_batch", type=int, default=4)
    p.add_argument("--eval_batch", type=int, default=4)
    p.add_argument("--max_source_len", type=int, default=256)
    p.add_argument("--max_target_len", type=int, default=256)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--eval_ratio", type=float, default=0.05, help="Portion of data used for evaluation")
    return p.parse_args()


def main() -> None:
    args = parse_args()

    data_path = Path(args.data)
    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found: {data_path}")

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(data_path)
    required = {"source", "target", "direction"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Dataset CSV missing columns: {missing}. Required: {sorted(required)}")

    df = df.dropna(subset=["source", "target", "direction"]).copy()
    df["direction"] = df["direction"].astype(str).str.strip()
    df = df[df["direction"].isin(PREFIX.keys())]
    if len(df) < 50:
        print(
            "WARNING: dataset sangat kecil. Model mungkin belum bagus. "
            "Untuk hasil lebih baik, targetkan ratusan hingga ribuan pasangan kalimat."
        )

    # Build input_text with instruction prefix
    df["input_text"] = df.apply(lambda r: PREFIX[r["direction"]] + str(r["source"]), axis=1)
    df["target_text"] = df["target"].astype(str)

    dataset = Dataset.from_pandas(df[["input_text", "target_text"]], preserve_index=False)
    dataset = dataset.shuffle(seed=args.seed)

    # Train/eval split
    eval_size = max(1, int(len(dataset) * args.eval_ratio))
    split = dataset.train_test_split(test_size=eval_size, seed=args.seed)
    train_ds = split["train"]
    eval_ds = split["test"]

    tokenizer = AutoTokenizer.from_pretrained(args.base_model)
    model = AutoModelForSeq2SeqLM.from_pretrained(args.base_model)

    max_source_len = int(args.max_source_len)
    max_target_len = int(args.max_target_len)

    def preprocess(batch):
        model_inputs = tokenizer(
            batch["input_text"],
            max_length=max_source_len,
            truncation=True,
        )
        labels = tokenizer(
            text_target=batch["target_text"],
            max_length=max_target_len,
            truncation=True,
        )
        model_inputs["labels"] = labels["input_ids"]
        return model_inputs

    train_tok = train_ds.map(preprocess, batched=True, remove_columns=train_ds.column_names)
    eval_tok = eval_ds.map(preprocess, batched=True, remove_columns=eval_ds.column_names)

    data_collator = DataCollatorForSeq2Seq(tokenizer=tokenizer, model=model)

    use_cuda = torch.cuda.is_available()

    training_args = Seq2SeqTrainingArguments(
        output_dir=str(out_dir),
        evaluation_strategy="steps",
        eval_steps=200,
        save_steps=200,
        logging_steps=50,
        learning_rate=float(args.lr),
        per_device_train_batch_size=int(args.train_batch),
        per_device_eval_batch_size=int(args.eval_batch),
        num_train_epochs=float(args.epochs),
        predict_with_generate=True,
        fp16=bool(use_cuda),
        generation_max_length=max_target_len,
        save_total_limit=2,
        seed=int(args.seed),
        report_to=[],
    )

    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=train_tok,
        eval_dataset=eval_tok,
        tokenizer=tokenizer,
        data_collator=data_collator,
    )

    trainer.train()

    print("Saving model to:", out_dir)
    trainer.save_model(str(out_dir))
    tokenizer.save_pretrained(str(out_dir))

    print("DONE")


if __name__ == "__main__":
    main()
