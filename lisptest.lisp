(declare @puti ($i))
(declare @func ($a $b))
(declare @main)

(define $test 0)
(define $testy 10)

; (data $dat 1000 (1, 2, 3))
; (data $dat 1000 "hello")
(data $dat 1000)

(defun @func 
	($a $b) 
	(
		(define $testy 
			(* 1000 
				(+ 4 4)))
		(set $test 
			(* 11 2))
		(if 
			(== $a 1)
			(set $b 2))
		(while 
			(> a 1)
			(call @puti $a)
			(set $a 
				(- a 1)))
		(return 
			(* $a $b))))

(defun @main
	()
	(
		(call @func 
			(1 
				(+ 2 
					(* 1 3))))
		(call @puti 
			(10))
		(return 
			(+ 120 
				(* 
					(call @func 
						(2 2))
					2)))))
